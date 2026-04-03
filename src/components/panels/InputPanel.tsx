import type { InputPanelProps } from '../../types/qc.types';

const InputPanel: React.FC<InputPanelProps> = ({
  newOD,
  setNewOD,
  protocolNo,
  setProtocolNo,
  onAddOD
}) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onAddOD();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-5 text-white h-full flex flex-col"
      style={{ 
        background: 'linear-gradient(135deg, #0000FF 0%, #0000CC 100%)',
        color: 'white'
      }}
    >
      <style>{`
        input[type="text"] {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }
      `}</style>
      
      <div className="space-y-3 mb-5">
        <div>
          <label className="block text-xs font-semibold text-blue-50 mb-1.5">OD VALUE (ABS)</label>
          <input
            type="text"
            inputMode="decimal"
            value={newOD}
            onChange={(e) => setNewOD(e.target.value)}
            placeholder="0.000"
            autoComplete="off"
            style={{
              backgroundColor: 'white',
              color: '#0000FF',
              border: '2px solid white'
            }}
            className="w-full rounded-lg px-3.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-blue-50 mb-1.5">PROTOCOL NO.</label>
          <input
            type="text"
            value={protocolNo}
            onChange={(e) => setProtocolNo(e.target.value)}
            placeholder="Enter protocol number"
            autoComplete="off"
            style={{
              backgroundColor: 'white',
              color: '#0000FF',
              border: '2px solid white'
            }}
            className="w-full rounded-lg px-3.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      <button
        type="submit"
        style={{
          backgroundColor: 'white',
          color: '#0000FF'
        }}
        className="w-full text-sm font-bold py-2 rounded-lg hover:bg-blue-50 transition-colors mt-auto"
      >
        Submit Recording →
      </button>
    </form>
  );
};

export default InputPanel;
