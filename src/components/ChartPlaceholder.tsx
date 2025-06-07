import React from 'react';

// Temporary placeholder components for charts while resolving dependency issues
export const ResponsiveContainer: React.FC<{ children: React.ReactNode; width?: string | number; height?: string | number }> = ({ children, width = "100%", height = 300 }) => (
  <div style={{ width, height }} className="border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
    <div className="text-center text-gray-500">
      <div className="text-lg">📊</div>
      <div>Chart Component</div>
      <div className="text-sm">(Loading...)</div>
    </div>
  </div>
);

export const PieChart: React.FC<{ children?: React.ReactNode; width?: number; height?: number }> = ({ children, width = 300, height = 300 }) => (
  <div style={{ width, height }} className="border border-gray-300 rounded flex items-center justify-center bg-gray-50">
    <div className="text-center text-gray-500">
      <div className="text-2xl">🥧</div>
      <div>Pie Chart</div>
    </div>
  </div>
);

export const BarChart: React.FC<{ children?: React.ReactNode; width?: number; height?: number; data?: any[] }> = ({ children, width = 300, height = 300 }) => (
  <div style={{ width, height }} className="border border-gray-300 rounded flex items-center justify-center bg-gray-50">
    <div className="text-center text-gray-500">
      <div className="text-2xl">📊</div>
      <div>Bar Chart</div>
    </div>
  </div>
);

export const LineChart: React.FC<{ children?: React.ReactNode; width?: number; height?: number; data?: any[] }> = ({ children, width = 300, height = 300 }) => (
  <div style={{ width, height }} className="border border-gray-300 rounded flex items-center justify-center bg-gray-50">
    <div className="text-center text-gray-500">
      <div className="text-2xl">📈</div>
      <div>Line Chart</div>
    </div>
  </div>
);

export const Pie: React.FC<any> = () => null;
export const Bar: React.FC<any> = () => null;
export const Line: React.FC<any> = () => null;
export const XAxis: React.FC<any> = () => null;
export const YAxis: React.FC<any> = () => null;
export const CartesianGrid: React.FC<any> = () => null;
export const Tooltip: React.FC<any> = () => null;
export const Legend: React.FC<any> = () => null;
export const Cell: React.FC<any> = () => null;