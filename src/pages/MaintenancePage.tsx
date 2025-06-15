import * as React from 'react';
const { useEffect, useState } = React;
import { Card, Button } from '../components/CommonUI';

interface MaintenanceInfo {
  title: string;
  message: string;
  expectedRestoreTime?: string;
  contactInfo: {
    email: string;
    phone: string;
  };
  lastUpdate: string;
  maintenanceType: 'scheduled' | 'emergency' | 'security';
  affectedServices: string[];
}

const MaintenancePage: React.FC = () => {
  const [maintenanceInfo, setMaintenanceInfo] = useState<MaintenanceInfo>({
    title: '緊急システムメンテナンス実施中',
    message: 'セキュリティ上の重要な更新のため、システムの緊急メンテナンスを実施しております。ご利用の皆様にはご不便をおかけし、誠に申し訳ございません。',
    expectedRestoreTime: '2025年6月14日 18:00',
    contactInfo: {
      email: 'support@servicegrid.local',
      phone: '03-XXXX-XXXX'
    },
    lastUpdate: new Date().toLocaleString('ja-JP'),
    maintenanceType: 'emergency',
    affectedServices: ['IT資産管理', 'インシデント管理', 'サービス要求', 'レポート機能']
  });

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString('ja-JP'));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('ja-JP'));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getMaintenanceTypeColor = (type: string) => {
    switch (type) {
      case 'emergency': return 'text-red-600';
      case 'security': return 'text-orange-600';
      case 'scheduled': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getMaintenanceTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency': return '🚨';
      case 'security': return '🛡️';
      case 'scheduled': return '🔧';
      default: return '⚠️';
    }
  };

  const refreshStatus = () => {
    setMaintenanceInfo(prev => ({
      ...prev,
      lastUpdate: new Date().toLocaleString('ja-JP')
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4" role="img" aria-label="メンテナンス中">
            {getMaintenanceTypeIcon(maintenanceInfo.maintenanceType)}
          </div>
          <h1 className={`text-4xl font-bold mb-2 ${getMaintenanceTypeColor(maintenanceInfo.maintenanceType)}`}>
            {maintenanceInfo.title}
          </h1>
          <p className="text-xl text-slate-600">
            現在時刻: {currentTime}
          </p>
        </div>

        {/* Main Message */}
        <Card className="text-center">
          <div className="p-6">
            <p className="text-lg text-slate-700 leading-relaxed mb-6">
              {maintenanceInfo.message}
            </p>
            
            {maintenanceInfo.expectedRestoreTime && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-800 mb-2">
                  🕐 サービス復旧予定時刻
                </h3>
                <p className="text-2xl font-bold text-blue-600">
                  {maintenanceInfo.expectedRestoreTime}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  ※状況により変更される場合があります
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Affected Services */}
        <Card title="影響を受けるサービス">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {maintenanceInfo.affectedServices.map((service, index) => (
              <div key={index} className="flex items-center p-3 bg-red-50 rounded-lg">
                <span className="text-red-500 mr-2">❌</span>
                <span className="text-red-700 font-medium">{service}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Contact Information */}
        <Card title="緊急時お問い合わせ先">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📧</span>
                <div>
                  <p className="font-semibold text-green-800">メール</p>
                  <p className="text-green-600">{maintenanceInfo.contactInfo.email}</p>
                </div>
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => window.location.href = `mailto:${maintenanceInfo.contactInfo.email}?subject=システムメンテナンスに関するお問い合わせ`}
              >
                メール送信
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📞</span>
                <div>
                  <p className="font-semibold text-blue-800">電話</p>
                  <p className="text-blue-600">{maintenanceInfo.contactInfo.phone}</p>
                </div>
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => window.location.href = `tel:${maintenanceInfo.contactInfo.phone.replace(/-/g, '')}`}
              >
                電話をかける
              </Button>
            </div>
          </div>
        </Card>

        {/* Status Update */}
        <Card className="text-center">
          <div className="p-4">
            <p className="text-sm text-slate-600 mb-4">
              最終更新: {maintenanceInfo.lastUpdate}
            </p>
            <Button 
              variant="primary" 
              onClick={refreshStatus}
              className="w-full md:w-auto"
            >
              🔄 ステータス更新
            </Button>
          </div>
        </Card>

        {/* Additional Information */}
        <Card>
          <div className="space-y-4 text-sm text-slate-600">
            <div className="flex items-start">
              <span className="text-lg mr-2">ℹ️</span>
              <div>
                <p className="font-semibold mb-1">メンテナンス中の注意事項</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>進行中の作業内容は保存されない場合があります</li>
                  <li>ログイン状態は維持されません</li>
                  <li>緊急時は上記連絡先までお問い合わせください</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-start">
              <span className="text-lg mr-2">🔒</span>
              <div>
                <p className="font-semibold mb-1">セキュリティに関するお知らせ</p>
                <p>
                  このメンテナンスはシステムのセキュリティ強化のために実施されています。
                  復旧後は新しいセキュリティ機能が適用されますので、ご協力をお願いいたします。
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MaintenancePage;