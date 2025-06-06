export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  description?: string;
  category: string;
  type: 'Server' | 'Desktop' | 'Laptop' | 'Tablet' | 'Phone' | 
        'Network Equipment' | 'Storage' | 'Printer' | 'Monitor' | 'Peripheral' |
        'Software' | 'License' | 'Virtual Machine' | 'Cloud Service' | 'Other';
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  department?: string;
  owner?: string;
  assignedTo?: string;
  status: 'Active' | 'Inactive' | 'Maintenance' | 'Retired';
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyExpiry?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  ipAddress?: string;
  macAddress?: string;
  operatingSystem?: string;
  softwareLicenses?: string[];
  configuration?: Record<string, any>;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  licenseKey?: string; 
  expiryDate?: string; 
}