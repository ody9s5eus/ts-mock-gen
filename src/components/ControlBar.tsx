import React from 'react';
import { Copy, Download, RefreshCw } from 'lucide-react';

interface ControlBarProps {
  quantity: number;
  setQuantity: (q: number) => void;
  includeOptional: boolean;
  setIncludeOptional: (b: boolean) => void;
  onGenerate: () => void;
  onCopy: () => void;
  onDownload: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  quantity,
  setQuantity,
  includeOptional,
  setIncludeOptional,
  onGenerate,
  onCopy,
  onDownload,
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700 text-white">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">TypeMock</h1>

        <div className="flex items-center space-x-2 bg-gray-700 rounded-md px-3 py-1">
          <label className="text-sm text-gray-300">Count:</label>
          <input
            type="number"
            min={1}
            max={100}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-16 bg-transparent border-none focus:ring-0 text-white text-center"
          />
        </div>

        <button
          onClick={() => setIncludeOptional(!includeOptional)}
          className={`px-3 py-1 rounded-md text-sm transition-colors ${includeOptional ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
        >
          {includeOptional ? 'Optional: ON' : 'Optional: OFF'}
        </button>
      </div>

      <div className="flex items-center space-x-2">
        <button onClick={onGenerate} className="flex items-center space-x-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white font-medium transition-colors">
            <RefreshCw size={16} />
            <span>Generate</span>
        </button>
        <button onClick={onCopy} className="p-2 hover:bg-gray-700 rounded-md text-gray-300 transition-colors" title="Copy JSON">
            <Copy size={20} />
        </button>
        <button onClick={onDownload} className="p-2 hover:bg-gray-700 rounded-md text-gray-300 transition-colors" title="Download JSON">
            <Download size={20} />
        </button>
      </div>
    </div>
  );
};
