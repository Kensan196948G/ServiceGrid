import * as React from 'react';
import { ServiceRequest } from '../types';
import { Button, Card } from './CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { itemStatusToJapanese } from '../localization';

interface ServiceRequestCardProps {
  request: ServiceRequest;
  onEdit: (request: ServiceRequest) => void;
  onApprove?: (request: ServiceRequest) => void;
  onReject?: (request: ServiceRequest) => void;
  onStart?: (request: ServiceRequest) => void;
  onComplete?: (request: ServiceRequest) => void;
  onDelete?: (request: ServiceRequest) => void;
  compact?: boolean;
}

const ServiceRequestCard: React.FC<ServiceRequestCardProps> = ({
  request,
  onEdit,
  onApprove,
  onReject,
  onStart,
  onComplete,
  onDelete,
  compact = false
}) => {
  const { user } = useAuth();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted':
      case 'Pending Approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Fulfilled':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected':
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-500 text-white';
      case 'High':
        return 'bg-orange-500 text-white';
      case 'Medium':
        return 'bg-yellow-500 text-white';
      case 'Low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const canApprove = user?.role === 'administrator' || user?.role === 'operator';
  const canManage = user?.role === 'administrator';

  return (
    <Card className={`${compact ? 'p-4' : 'p-6'} hover:shadow-lg transition-shadow duration-200`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className={`font-semibold text-gray-900 ${compact ? 'text-lg' : 'text-xl'}`}>
              {request.subject}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              ID: {request.id} | 要求者: {request.requester_username || request.requester_name}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(request.priority)}`}>
              {request.priority}
            </span>
            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(request.status)}`}>
              {request.status}
            </span>
          </div>
        </div>

        {/* Content */}
        {!compact && (
          <div className="space-y-3">
            <div>
              <p className="text-gray-700 text-sm leading-relaxed">
                {request.detail}
              </p>
            </div>
            
            {request.category && (
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span><strong>カテゴリ:</strong> {request.category}</span>
                {request.requested_item && (
                  <span><strong>要求項目:</strong> {request.requested_item}</span>
                )}
              </div>
            )}
            
            {request.estimated_cost && request.estimated_cost > 0 && (
              <div className="text-sm text-gray-600">
                <strong>予想費用:</strong> ¥{request.estimated_cost.toLocaleString()}
              </div>
            )}
            
            {request.requested_delivery_date && (
              <div className="text-sm text-gray-600">
                <strong>希望納期:</strong> {formatDate(request.requested_delivery_date)}
              </div>
            )}
            
            {request.business_justification && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>業務上の正当化理由:</strong><br />
                  {request.business_justification}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            作成日: {formatDate(request.created_date)}
            {request.approved_date && (
              <span className="ml-3">承認日: {formatDate(request.approved_date)}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(request)}
            >
              編集
            </Button>
            
            {/* Workflow Actions */}
            {canApprove && (
              <>
                {(request.status === 'Submitted' || request.status === 'Pending Approval') && (
                  <>
                    {onApprove && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => onApprove(request)}
                      >
                        承認
                      </Button>
                    )}
                    {onReject && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => onReject(request)}
                      >
                        却下
                      </Button>
                    )}
                  </>
                )}
                
                {request.status === 'Approved' && onStart && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onStart(request)}
                  >
                    作業開始
                  </Button>
                )}
                
                {request.status === 'In Progress' && 
                 request.fulfiller_username === user?.username && 
                 onComplete && (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => onComplete(request)}
                  >
                    完了
                  </Button>
                )}
              </>
            )}
            
            {canManage && onDelete && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => onDelete(request)}
              >
                削除
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ServiceRequestCard;