import * as React from 'react';
const { useState, useEffect, useCallback } = React;
import { ServiceRequest } from '../types';
import { Button, Input, Textarea, Select } from './CommonUI';
import { useToast } from '../hooks/useToast';
import { validateServiceRequest } from '../utils/formValidation';

interface ServiceRequestFormProps {
  initialData?: Partial<ServiceRequest>;
  onSubmit: (data: ServiceRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const ServiceRequestForm: React.FC<ServiceRequestFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<Partial<ServiceRequest>>({
    subject: '',
    detail: '',
    category: '',
    priority: 'Medium',
    status: 'Submitted',
    requested_item: '',
    business_justification: '',
    estimated_cost: 0,
    requested_delivery_date: '',
    ...initialData
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { addToast } = useToast();

  const serviceTypes = [
    'アカウント作成',
    'ソフトウェアインストール', 
    'ハードウェアリクエスト',
    'アクセスリクエスト',
    '一般問い合わせ'
  ];

  const priorityOptions = [
    { value: 'Low', label: '低' },
    { value: 'Medium', label: '中' },
    { value: 'High', label: '高' },
    { value: 'Urgent', label: '緊急' }
  ];

  const statusOptions = [
    { value: 'Submitted', label: '提出済み' },
    { value: 'Pending Approval', label: '承認待ち' },
    { value: 'Approved', label: '承認済み' },
    { value: 'Rejected', label: '却下' },
    { value: 'In Progress', label: '進行中' },
    { value: 'Fulfilled', label: '完了' },
    { value: 'Cancelled', label: 'キャンセル' }
  ];

  useEffect(() => {
    if (initialData) {
      setFormData({ ...formData, ...initialData });
    }
  }, [initialData]);

  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validation = validateServiceRequest(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      addToast('入力内容を確認してください', 'error');
      return;
    }

    try {
      await onSubmit(formData as ServiceRequest);
      addToast('サービス要求が正常に保存されました', 'success');
    } catch (error) {
      console.error('Form submission error:', error);
      addToast('保存に失敗しました', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <Input
            label="件名 *"
            name="subject"
            value={formData.subject || ''}
            onChange={handleInputChange}
            error={errors.subject}
            required
            placeholder="サービス要求の件名を入力してください"
          />
        </div>

        <div className="md:col-span-2">
          <Textarea
            label="詳細 *"
            name="detail"
            value={formData.detail || ''}
            onChange={handleInputChange}
            error={errors.detail}
            required
            placeholder="要求の詳細内容を記述してください"
            rows={4}
          />
        </div>

        <Select
          label="カテゴリ"
          name="category"
          value={formData.category || ''}
          onChange={handleInputChange}
          options={serviceTypes.map(type => ({ value: type, label: type }))}
          error={errors.category}
        />

        <Select
          label="優先度 *"
          name="priority"
          value={formData.priority || 'Medium'}
          onChange={handleInputChange}
          options={priorityOptions}
          error={errors.priority}
          required
        />

        {initialData?.id && (
          <Select
            label="ステータス"
            name="status"
            value={formData.status || 'Submitted'}
            onChange={handleInputChange}
            options={statusOptions}
            error={errors.status}
          />
        )}

        <Input
          label="要求項目"
          name="requested_item"
          value={formData.requested_item || ''}
          onChange={handleInputChange}
          error={errors.requested_item}
          placeholder="具体的な要求項目"
        />

        <div className="md:col-span-2">
          <Textarea
            label="業務上の正当化理由"
            name="business_justification"
            value={formData.business_justification || ''}
            onChange={handleInputChange}
            error={errors.business_justification}
            placeholder="なぜこの要求が必要なのか説明してください"
            rows={3}
          />
        </div>

        <Input
          label="予想費用"
          name="estimated_cost"
          type="number"
          value={formData.estimated_cost || 0}
          onChange={handleInputChange}
          error={errors.estimated_cost}
          min="0"
          step="0.01"
        />

        <Input
          label="希望納期"
          name="requested_delivery_date"
          type="date"
          value={formData.requested_delivery_date || ''}
          onChange={handleInputChange}
          error={errors.requested_delivery_date}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
        >
          {isLoading ? '保存中...' : initialData?.id ? '更新' : '作成'}
        </Button>
      </div>
    </form>
  );
};

export default ServiceRequestForm;