'use client';

import React from 'react';

interface ExperimentResultTableProps {
  data: any[];
  title?: string;
}

export default function ExperimentResultTable({ data, title }: ExperimentResultTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-gray-500">暂无数据</p>
      </div>
    );
  }

  // Auto-detect columns from first row's keys
  const columns = Object.keys(data[0]).filter(
    (key) => !key.startsWith('_') && key !== 'id'
  );

  const isNumeric = (value: any): boolean => {
    return typeof value === 'number' || (!isNaN(parseFloat(value)) && isFinite(value));
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') return Number.isInteger(value) ? value.toString() : value.toFixed(4);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-2">
      {title && (
        <h4 className="text-xs font-medium text-gray-700">{title}</h4>
      )}
      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {data.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                {columns.map((col) => {
                  const value = row[col];
                  const numeric = isNumeric(value);
                  return (
                    <td
                      key={col}
                      className={`px-3 py-2 text-xs whitespace-nowrap ${
                        numeric
                          ? 'font-mono text-blue-700 font-medium'
                          : 'text-gray-700'
                      }`}
                    >
                      {formatValue(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
