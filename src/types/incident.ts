import { ItemStatus, Priority } from './common';

export interface Incident {
  id: string;
  title: string;
  description: string;
  reportedBy: string;
  assignedTo?: string;
  status: ItemStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  category: string; 
}