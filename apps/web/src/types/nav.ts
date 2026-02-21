export interface NavItem {
  title: string;
  url: string;
  icon?: React.ElementType;
  is_active?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
}

