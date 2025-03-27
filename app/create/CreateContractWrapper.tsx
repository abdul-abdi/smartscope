'use client';

import { Suspense } from 'react';
import CreateContractPage from './CreateContractPage';
import { Loader2 } from 'lucide-react';

export default function CreateContractWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading editor...</span>
      </div>
    }>
      <CreateContractPage />
    </Suspense>
  );
} 