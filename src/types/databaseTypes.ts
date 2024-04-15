export interface DbCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface ViewConfig {
  targetTable: string;
  joins: string[];
  viewResource: string;
}

export type Projects = "RDA" | "FC4E";
