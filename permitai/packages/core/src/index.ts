export const version = '0.1.0';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export * from './types/permit';
export * from './types/workflow';
export * from './types/user';