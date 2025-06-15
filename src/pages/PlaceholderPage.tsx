import * as React from 'react';
import { Card } from '../components/CommonUI';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-slate-800">{title}</h2>
      <Card>
        <div className="p-12 text-center">
          <div className="text-6xl mb-6">🚧</div>
          <h3 className="text-2xl font-semibold text-slate-700 mb-3">
            {title}
          </h3>
          <p className="text-slate-500 text-lg">
            {description || `このページ (${title}) は現在準備中です。`}
          </p>
          <p className="text-slate-400 mt-2">
            まもなく機能が追加される予定です。ご期待ください。
          </p>
        </div>
      </Card>
    </div>
  );
};

export default PlaceholderPage;