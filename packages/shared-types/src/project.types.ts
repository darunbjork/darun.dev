export interface ProjectImage {
  id:        string;
  url:       string;
  publicId:  string;
  width:     number | null;
  height:    number | null;
  format:    string | null;
  bytes:     number | null;
  alt:       string | null;
  order:     number;
  createdAt: string;
}

export interface Project {
  id:             string;
  slug:           string;
  title:          string;
  description:    string | null;
  coverUrl:       string | null;
  techStack:      string[];
  problem:        string | null;
  solution:       string | null;
  impact:         string | null;
  learnings:      string | null;
  views:          number;
  uniqueVisitors: number;
  likeCount:      number;
  dislikeCount:   number;
  averageRating:  number;
  badge:          string | null;
  order:          number;
  featured:       boolean;
  published:      boolean;
  repoUrl:        string | null;
  liveUrl:        string | null;
  images:         ProjectImage[];
  createdAt:      string;
  updatedAt:      string;
}

export interface CreateProjectInput {
  slug: string
  title: string
  description: string | null
  coverUrl: string | null
  coverPublicId: string | null
  techStack: string[]
  problem: string | null
  solution: string | null
  impact: string | null
  learnings: string | null
  badge: string | null
  order: number
  featured: boolean
  published: boolean
  repoUrl: string | null
  liveUrl: string | null
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  published?: boolean;
}

export interface ProjectListItem {
  id:             string;
  slug:           string;
  title:          string;
  description:    string | null;
  coverUrl:       string | null;
  techStack:      string[];
  views:          number;
  uniqueVisitors: number;
  likeCount:      number;
  dislikeCount:   number;
  averageRating:  number;
  badge:          string | null;
  featured:       boolean;
  order:          number;
}