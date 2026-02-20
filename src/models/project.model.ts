// Project domain model and DTOs
// Epic 3: Portfolio module

export type ProjectStatus = 'Intake' | 'Discovery' | 'Development' | 'Testing' | 'Live' | 'Decommissioned' | 'On Hold';
export type ProjectDomain = 'Finance' | 'HR' | 'Operations' | 'Sales' | 'Marketing' | 'IT' | 'Legal' | 'Other';
export type ProjectProcess = 'Core' | 'Supporting' | 'Innovation' | 'Other';
export type ProjectAppSize = 'S' | 'M' | 'L' | 'XL';
export type ProjectComplexity = 'Low' | 'Medium' | 'High' | 'Very High';
export type ProjectAlertLevel = 'Green' | 'Yellow' | 'Orange' | 'Red';
export type ProjectGovernanceStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Not Applicable';

export const PROJECT_STATUSES: ProjectStatus[] = ['Intake', 'Discovery', 'Development', 'Testing', 'Live', 'Decommissioned', 'On Hold'];
export const PROJECT_DOMAINS: ProjectDomain[] = ['Finance', 'HR', 'Operations', 'Sales', 'Marketing', 'IT', 'Legal', 'Other'];
export const PROJECT_PROCESSES: ProjectProcess[] = ['Core', 'Supporting', 'Innovation', 'Other'];
export const PROJECT_APP_SIZES: ProjectAppSize[] = ['S', 'M', 'L', 'XL'];
export const PROJECT_COMPLEXITIES: ProjectComplexity[] = ['Low', 'Medium', 'High', 'Very High'];
export const PROJECT_ALERT_LEVELS: ProjectAlertLevel[] = ['Green', 'Yellow', 'Orange', 'Red'];
export const PROJECT_GOVERNANCE_STATUSES: ProjectGovernanceStatus[] = ['Not Started', 'In Progress', 'Completed', 'Not Applicable'];

export interface Project {
  id: string;
  name: string;
  departmentId: string | null;
  teamId: string | null;
  masterProjectId: string | null;
  status: ProjectStatus;
  domain: ProjectDomain | null;
  process: ProjectProcess | null;
  appSize: ProjectAppSize | null;
  complexity: ProjectComplexity | null;
  alertLevel: ProjectAlertLevel | null;
  governanceStatus: ProjectGovernanceStatus | null;
  governanceTemplate: string | null;
  infrastructureTemplate: string | null;
  operationsTemplate: string | null;
  startDate: string | null;
  goLiveDate: string | null;
  referenceNumber: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectWithDetails extends Project {
  departmentName: string | null;
  teamName: string | null;
  masterProjectName: string | null;
}

export interface CreateProjectDto {
  name: string;
  departmentId?: string;
  teamId?: string;
  masterProjectId?: string;
  status?: ProjectStatus;
  domain?: ProjectDomain;
  process?: ProjectProcess;
  appSize?: ProjectAppSize;
  complexity?: ProjectComplexity;
  alertLevel?: ProjectAlertLevel;
  governanceStatus?: ProjectGovernanceStatus;
  governanceTemplate?: string;
  infrastructureTemplate?: string;
  operationsTemplate?: string;
  startDate?: string;
  goLiveDate?: string;
  referenceNumber?: string;
  description?: string;
}

export interface UpdateProjectDto {
  name?: string;
  departmentId?: string | null;
  teamId?: string | null;
  masterProjectId?: string | null;
  status?: ProjectStatus;
  domain?: ProjectDomain | null;
  process?: ProjectProcess | null;
  appSize?: ProjectAppSize | null;
  complexity?: ProjectComplexity | null;
  alertLevel?: ProjectAlertLevel | null;
  governanceStatus?: ProjectGovernanceStatus | null;
  governanceTemplate?: string | null;
  infrastructureTemplate?: string | null;
  operationsTemplate?: string | null;
  startDate?: string | null;
  goLiveDate?: string | null;
  referenceNumber?: string | null;
  description?: string | null;
}

export interface ProjectFilters {
  search?: string;
  status?: ProjectStatus;
  departmentId?: string;
  teamId?: string;
  domain?: ProjectDomain;
  alertLevel?: ProjectAlertLevel;
  governanceStatus?: ProjectGovernanceStatus;
}
