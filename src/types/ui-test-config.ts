export interface ComponentConfig {
  name: string;
  id: string;
  selector: string;
  group: string;
  tags?: string[];
  forceHide?: {
    type: 'display' | 'visibility';
    selectors: string[];
    excludes?: string[];
  };
  preConditions?: () => Promise<void>;
}

export interface PageConfig {
  page: string;
  url: string;
  tags?: string[];
  components: ComponentConfig[];
}

export interface UITestConfig {
  PageList: PageConfig[];
  ForceHideSelectors: string[];
}