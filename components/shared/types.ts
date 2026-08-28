import type {
  ChangeEventHandler,
  ComponentPropsWithoutRef,
  ComponentRef,
  Dispatch,
  ElementType,
  FocusEventHandler,
  ImgHTMLAttributes,
  KeyboardEventHandler,
  ReactNode,
  SetStateAction,
  RefAttributes,
} from "react";
import type { Pagination } from "@/lib/pagination/types";

/** Merge a primitive's own props with the props of its chosen rendered element. */
export type PolymorphicProps<Element extends ElementType, Props> = Props & {
  as?: Element;
} & Omit<ComponentPropsWithoutRef<Element>, keyof Props | "as">;

/** Preserve the correctly typed ref when a polymorphic primitive changes element. */
export type PolymorphicRefProps<Element extends ElementType> = RefAttributes<ComponentRef<Element>>;

/** Common presentation options for a reusable content-card surface. */
export type ContentCardOptions = {
  interactive?: boolean;
  selected?: boolean;
  selectedTone?: "cyan" | "yellow";
  className?: string;
  children?: ReactNode;
};

/** Element-aware props for `ContentCard`; defaults to a `div`. */
export type ContentCardProps<Element extends ElementType = "div"> = PolymorphicProps<Element, ContentCardOptions>;

/** A card with an optional background image and a content rail. */
export type ImageRailCardOptions = ContentCardOptions & {
  imageUrl?: string | null;
  imageAlt?: string;
  railClassName?: string;
};

/** Element-aware props for `ImageRailCard`; defaults to a `div`. */
export type ImageRailCardProps<Element extends ElementType = "div"> = PolymorphicProps<Element, ImageRailCardOptions>;

/** Props for an image that retries through the local proxy after an error. */
export type ResilientRemoteImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  /** Retries once through the local image proxy after the original URL fails. */
  proxyOnError?: boolean;
};

/** Props for the layered remote-image treatment used for undersized images. */
export type BackdropRemoteImageProps = ResilientRemoteImageProps & {
  alt: string;
  imageClassName?: string;
  undersizedImageClassName?: string;
  backdropClassName?: string;
  foregroundWrapperClassName?: string;
  minimumSourceWidth?: number;
  minimumSourceHeight?: number;
};

/** Intersection-observer behavior for a single pagination sentinel. */
export type InfiniteScrollOptions = {
  enabled: boolean;
  loading: boolean;
  pageKey: string | number;
  onLoadMore: () => void;
  rootMargin?: string;
};

/** Renderable sentinel wrapper used by lists with shared infinite scroll. */
export type InfiniteScrollControlProps = InfiniteScrollOptions & {
  className?: string;
  loadingLabel?: string;
};

/** Transport contract for an offset-paginated collection. */
export type PaginatedPage<T> = Pagination & {
  items?: T[];
};

export type PaginatedCollectionOptions<T> = {
  /** Changes reset the collection to its new first page. */
  resourceKey: string | null | undefined;
  initialItems: T[];
  initialPagination?: Pagination | null;
  loadPage: (request: { offset: number }) => Promise<PaginatedPage<T>>;
  getId?: (item: T) => string | null | undefined;
};

export type PaginatedCollection<T> = {
  items: T[];
  hasNextPage: boolean;
  isLoadingMore: boolean;
  loadMore: () => Promise<void>;
  setItems: Dispatch<SetStateAction<T[]>>;
};

/** Semantic header content with an optional companion action. */
export type CompactRailHeaderOptions = {
  className?: string;
  title: ReactNode;
  kicker?: ReactNode;
  action?: ReactNode;
  titleClassName?: string;
};

export type CompactRailHeaderProps<Element extends ElementType = "div"> = PolymorphicProps<Element, CompactRailHeaderOptions>;

/** The content and tone for a selectable workspace creation card. */
export type CreateCardOptions = {
  tone?: "primary" | "secondary";
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  className?: string;
  children?: ReactNode;
};

export type CreateCardProps<Element extends ElementType = "button"> = PolymorphicProps<Element, CreateCardOptions>;

/** Controlled input contract for editable inline titles. */
export type InlineTitleFieldProps = {
  autoFocus?: boolean;
  value: string;
  placeholder?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  heading?: boolean;
};

export type SectionCardProps = {
  title?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  actionAlign?: "left" | "right";
  className?: string;
};

/** A compact textual status marker; its text determines the visual tone. */
export type StatusPillProps = { children?: ReactNode };

/** The modal drawer shell shared by temporary editing and management surfaces. */
export type SideDrawerProps = {
  size?: "narrow" | "wide" | "xwide";
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
};

/** Scrollable content region intended to be nested inside `SideDrawer`. */
export type SideDrawerBodyProps = { children?: ReactNode };

/** Globally positioned transient feedback messages. */
export type ToastMessagesProps = {
  errorMessage?: ReactNode;
  successMessage?: ReactNode;
};

/** A small-screen horizontal rail with active-slide indicators. */
export type MobileSwipeRailProps<T> = {
  items: T[];
  getKey: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
  shellClassName?: string;
  railClassName?: string;
};
