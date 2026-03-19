import type {
  Column,
  ColumnDef,
  PaginationState,
  Row,
  RowData,
  Table,
  TableMeta,
  TableState,
  Updater,
} from '@tanstack/table-core'

export type DataGridDensity = 'compact' | 'default' | 'comfortable'
export type DataGridState = Partial<TableState>

export interface DataGridRenderContext<TData extends RowData> {
  table: Table<TData>
  state: DataGridState
  column?: Column<TData, unknown>
}

export interface DataGridRowRenderContext<TData extends RowData> extends DataGridRenderContext<TData> {
  row: Row<TData>
}

export type DataGridSlot<TData extends RowData> = any | ((context: DataGridRenderContext<TData>) => any)
export type DataGridRowSlot<TData extends RowData> = any | ((context: DataGridRowRenderContext<TData>) => any)

export interface DataGridProps<TData extends RowData> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  class?: string
  rootClass?: string
  toolbarClass?: string
  tableClass?: string
  headerRowClass?: string
  headerCellClass?: string
  bodyRowClass?: string
  bodyCellClass?: string
  footerClass?: string
  getRowId?: (row: TData, index: number) => string
  getSubRows?: (row: TData, index: number) => undefined | TData[]
  state?: DataGridState
  initialState?: DataGridState
  onStateChange?: (updater: Updater<TableState>) => void
  defaultColumn?: Partial<ColumnDef<TData, unknown>>
  meta?: TableMeta<TData>
  sortable?: boolean
  filterable?: boolean
  selectable?: boolean
  expandable?: boolean
  paginated?: boolean
  reorderableColumns?: boolean
  stickyHeader?: boolean
  manualSorting?: boolean
  manualFiltering?: boolean
  manualPagination?: boolean
  pageCount?: number
  rowCount?: number
  density?: DataGridDensity
  onDensityChange?: (density: DataGridDensity) => void
  pageSizeOptions?: number[]
  defaultPageSize?: number
  loading?: boolean
  loadingRows?: number
  emptyMessage?: string
  globalSearchPlaceholder?: string
  showToolbar?: boolean
  showGlobalFilter?: boolean
  showColumnVisibility?: boolean
  showDensitySelector?: boolean
  showSelectedCount?: boolean
  showResetButton?: boolean
  toolbarStart?: DataGridSlot<TData>
  toolbarEnd?: DataGridSlot<TData>
  rowActions?: DataGridRowSlot<TData>
  expandedRow?: DataGridRowSlot<TData>
  emptyState?: DataGridSlot<TData>
  renderFallbackValue?: any
}

export type DataGridPaginationState = Partial<PaginationState>
