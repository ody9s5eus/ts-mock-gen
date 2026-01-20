import { useState, useEffect, useCallback } from 'react';
import { TypeParser } from './core/TypeParser';
import { MockGenerator, type GeneratorOptions } from './core/MockGenerator';
import { CodeEditor } from './components/CodeEditor';
import { ControlBar } from './components/ControlBar';
import { Settings } from 'lucide-react';

const DEFAULT_CODE = `
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  avatar?: string;
  role: "admin" | "user" | "guest";
  isActive: boolean;
  tags: string[];
  address: {
    street: string;
    city: string;
    zip: string;
  };
}
`;

const DEFAULT_RULES = `
{
  "id": "string.uuid",
  "avatar": "image.avatar"
}
`;

function App() {
  const [tsCode, setTsCode] = useState<string>(DEFAULT_CODE);
  const [rulesJson, setRulesJson] = useState<string>(DEFAULT_RULES);
  const [outputJson, setOutputJson] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(5);
  const [includeOptional, setIncludeOptional] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [parser] = useState(() => new TypeParser());
  const [generator] = useState(() => new MockGenerator());

  const handleGenerate = useCallback(() => {
    try {
      setError(null);
      const schemas = parser.parseSchema(tsCode);

      let rules = {};
      try {
        rules = JSON.parse(rulesJson);
      } catch (e) {
        setError('Invalid Rules JSON');
        return;
      }

      const options: GeneratorOptions = {
        quantity,
        includeOptional,
        rules
      };

      const data = generator.generate(schemas, options);
      setOutputJson(JSON.stringify(data, null, 2));
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to generate data');
    }
  }, [tsCode, rulesJson, quantity, includeOptional, parser, generator]);

  // Initial generation
  useEffect(() => {
    handleGenerate();
  }, []); // Run once on mount

  const handleCopy = () => {
    navigator.clipboard.writeText(outputJson);
  };

  const handleDownload = () => {
    const blob = new Blob([outputJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mock-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      <ControlBar
        quantity={quantity}
        setQuantity={setQuantity}
        includeOptional={includeOptional}
        setIncludeOptional={setIncludeOptional}
        onGenerate={handleGenerate}
        onCopy={handleCopy}
        onDownload={handleDownload}
      />

      {error && (
        <div className="bg-red-600 text-white px-4 py-2 text-sm font-medium">
          Error: {error}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left: TypeScript Input */}
        <div className="flex-1 border-r border-gray-700 flex flex-col min-w-0">
          <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 text-sm font-semibold text-gray-300 flex justify-between">
            <span>TypeScript Interface</span>
          </div>
          <div className="flex-1 relative">
             <CodeEditor
               value={tsCode}
               onChange={(val) => setTsCode(val || '')}
               language="typescript"
             />
          </div>
        </div>

        {/* Middle: Rules JSON */}
        <div className="w-1/4 border-r border-gray-700 flex flex-col min-w-[200px] max-w-[400px]">
          <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 text-sm font-semibold text-gray-300 flex items-center space-x-2">
            <Settings size={14} />
            <span>Override Rules</span>
          </div>
          <div className="flex-1 relative">
            <CodeEditor
               value={rulesJson}
               onChange={(val) => setRulesJson(val || '')}
               language="json"
             />
          </div>
        </div>

        {/* Right: JSON Output */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 text-sm font-semibold text-gray-300">
            <span>JSON Output</span>
          </div>
          <div className="flex-1 relative">
            <CodeEditor
               value={outputJson}
               onChange={() => {}}
               language="json"
               readOnly={true}
             />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
