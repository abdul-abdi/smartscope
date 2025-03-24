import React from 'react';
import Link from 'next/link';
import { Button } from '../../../../components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ContractHeaderProps {
  contractAddress: string;
}

const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

const ContractHeader: React.FC<ContractHeaderProps> = ({ contractAddress }) => {
  return (
    <div className="mb-6 flex items-center">
      <Link href="/interact" className="inline-flex items-center">
        <Button variant="ghost" size="sm" className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </Link>
      <h1 className="text-2xl font-bold">
        {contractAddress ? truncateAddress(contractAddress) : 'Contract Interaction'}
      </h1>
    </div>
  );
};

export default ContractHeader; 