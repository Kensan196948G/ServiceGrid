import { ItemStatus, Priority } from './common';

export interface Incident {
  id: string;
  title: string;
  description: string;
  reportedBy: string;
  reporter?: string;
  assignee?: string;
  assignedTo?: string;
  status: ItemStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  category: string;
  impact?: 'Low' | 'Medium' | 'High';
  urgency?: 'Low' | 'Medium' | 'High';
  slaTargetTime?: string;
  affectedUsers?: number;
  resolution?: string;
  workaround?: string;
  relatedAssets?: string[];
  tags?: string[];
}