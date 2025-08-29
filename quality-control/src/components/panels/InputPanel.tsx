import React from 'react';
import { Plus, Download } from 'lucide-react';
import type { InputPanelProps } from '../../types/qc.types';
import Button from '../ui/Button';
import Input from '../ui/Input';

const InputPanel: React.FC<InputPanelProps> = ({
  newOD,
  setNewOD,
  onAddOD,
  parameters,
  onParametersChange,
  onExport,
  onClear
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Add New OD Reading</h3>
      
      <div className="space-y-4">
        <Input
          label="OD Value"
          type="number"
          step="0.001"
          value={newOD}
          onChange={setNewOD}
          placeholder="Enter OD value"
          onKeyPress={(e) => e.key === 'Enter' && onAddOD()}
        />
        
        <Button onClick={onAddOD} className="w-full">
          <Plus size={16} />
          Add Reading
        </Button>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Target Parameters</h4>
          <div className="space-y-2">
            <Input
              label="Mean"
              type="number"
              step="0.001"
              value={parameters.targetMean.toString()}
              onChange={(value) => onParametersChange({
                ...parameters,
                targetMean: parseFloat(value) || 0
              })}
              size="sm"
            />
            <Input
              label="SD"
              type="number"
              step="0.001"
              value={parameters.targetSD.toString()}
              onChange={(value) => onParametersChange({
                ...parameters,
                targetSD: parseFloat(value) || 0
              })}
              size="sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onExport} variant="success" size="sm" className="flex-1">
            <Download size={14} />
            Export
          </Button>
          <Button onClick={onClear} variant="danger" size="sm" className="flex-1">
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InputPanel;