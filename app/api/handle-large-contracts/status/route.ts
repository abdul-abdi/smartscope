import { NextResponse } from 'next/server';

// Store deployment statuses in memory
// In a production app, you'd use a more persistent storage like Redis
const deploymentStatuses = new Map<string, {
  progress: number;
  stage: string;
  status: 'pending' | 'completed' | 'error';
  contractAddress?: string;
  error?: string;
  timestamp?: number;
}>();

// Function to get deployment ID from cookie or create a new one
function getDeploymentId(request: Request): string {
  // Look for id in URL query params
  const url = new URL(request.url);
  const idParam = url.searchParams.get('id');
  
  if (idParam) {
    return idParam;
  }
  
  // In a real app, you'd use cookies or session to identify the client
  return 'deployment-123'; // Simplified for this example
}

// Function to update status (internal helper, not exported)
function updateDeploymentStatus(
  deploymentId: string, 
  data: {
    progress?: number;
    stage?: string;
    status?: 'pending' | 'completed' | 'error';
    contractAddress?: string;
    error?: string;
  }
): void {
  const currentStatus = deploymentStatuses.get(deploymentId) || {
    progress: 0,
    stage: 'Initializing',
    status: 'pending',
    timestamp: Date.now()
  };

  deploymentStatuses.set(deploymentId, {
    ...currentStatus,
    ...data,
    timestamp: Date.now()
  });
  
  // Log status update for debugging
  console.log(`Status update for ${deploymentId}:`, {
    ...currentStatus,
    ...data
  });
}

// SSE handler
export async function GET(request: Request) {
  const deploymentId = getDeploymentId(request);
  console.log(`SSE connection established for deployment ${deploymentId}`);
  
  // Initialize status if it doesn't exist
  if (!deploymentStatuses.has(deploymentId)) {
    deploymentStatuses.set(deploymentId, {
      progress: 0,
      stage: 'Preparing deployment',
      status: 'pending',
      timestamp: Date.now()
    });
  }

  // Set headers for SSE
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'  // Important for Nginx
  });

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial status
      const status = deploymentStatuses.get(deploymentId);
      if (status) {
        const message = `data: ${JSON.stringify(status)}\n\n`;
        controller.enqueue(encoder.encode(message));
      }

      // Send a ping immediately to ensure connection is established
      controller.enqueue(encoder.encode(`: ping\n\n`));

      // Setup interval to check for updates
      const interval = setInterval(() => {
        // Send a ping to keep connection alive
        controller.enqueue(encoder.encode(`: ping\n\n`));
        
        const currentStatus = deploymentStatuses.get(deploymentId);
        if (currentStatus) {
          const message = `data: ${JSON.stringify(currentStatus)}\n\n`;
          controller.enqueue(encoder.encode(message));

          // If deployment is completed or errored, close the stream after sending the final status
          if (currentStatus.status === 'completed' || currentStatus.status === 'error') {
            console.log(`Closing SSE stream for deployment ${deploymentId} with final status: ${currentStatus.status}`);
            
            // Send one more time to ensure client gets it
            controller.enqueue(encoder.encode(message));
            
            clearInterval(interval);
            setTimeout(() => controller.close(), 1000); // Give it a second to ensure client gets the message
          }
        }
      }, 1000);

      // Clean up when the client disconnects
      request.signal.addEventListener('abort', () => {
        console.log(`SSE connection closed for deployment ${deploymentId}`);
        clearInterval(interval);
      });
    }
  });

  return new Response(stream, { headers });
} 