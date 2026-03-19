import { Component } from '@geajs/core'
import {
  createTable,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/table-core'
import type { Column, RowData } from '@tanstack/table-core'
import Pagination from '../pagination'
import { cn } from '../../utils/cn'
import {
  applyStateUpdater,
  createInitialDataGridState,
  getDensityClasses,
  getSortIndicator,
  mergeDataGridState,
  moveItem,
  renderValue,
  resolveDensity,
} from './helpers'
import type { DataGridDensity, DataGridProps, DataGridRenderContext, DataGridRowRenderContext } from './types'

export * from './types'

export default class DataGrid extends Component {
  density: DataGridDensity = 'default'
  showColumnPanel = false
  showGlobalFilter = true
  tableState: Record<string, any> = {}

  created(props: DataGridProps<any>) {
    this.density = resolveDensity(props.density)
    this.showColumnPanel = false
    this.showGlobalFilter = props.showGlobalFilter ?? props.filterable ?? true
    this.tableState = createInitialDataGridState(props)
  }

  __onPropChange(prop: string) {
    if (prop === 'density' && this.props.density) {
      this.density = resolveDensity(this.props.density)
    }
    if (prop === 'showGlobalFilter' || prop === 'filterable') {
      this.showGlobalFilter = this.props.showGlobalFilter ?? this.props.filterable ?? true
    }
    this.__geaRequestRender()
  }

  getResolvedState(props: DataGridProps<any>) {
    return mergeDataGridState(this.tableState, props.state)
  }

  updateTableState(props: DataGridProps<any>, updater: any) {
    const nextState = applyStateUpdater(this.getResolvedState(props), updater)
    this.tableState = nextState
    props.onStateChange?.(updater)
  }

  setDensityValue(nextDensity: DataGridDensity) {
    this.density = nextDensity
    this.props.onDensityChange?.(nextDensity)
  }

  toggleColumnPanel() {
    this.showColumnPanel = !this.showColumnPanel
  }

  setGlobalFilter(table: any, value: string) {
    table.setGlobalFilter(value)
  }

  setColumnFilter(column: Column<any, unknown>, value: string) {
    column.setFilterValue(value || undefined)
  }

  moveColumn(table: any, columnId: string, direction: -1 | 1) {
    const columns = table.getAllLeafColumns().map((column: any) => column.id)
    const currentOrder = table.getState().columnOrder?.length ? table.getState().columnOrder : columns
    const currentIndex = currentOrder.indexOf(columnId)
    const nextIndex = currentIndex + direction

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentOrder.length) return

    table.setColumnOrder(moveItem(currentOrder, currentIndex, nextIndex))
  }

  buildTable(props: DataGridProps<any>) {
    const expandedEnabled = props.expandable ?? Boolean(props.expandedRow)
    const resolvedState = this.getResolvedState(props)

    return createTable({
      data: props.data ?? [],
      columns: props.columns ?? [],
      state: resolvedState,
      initialState: props.initialState,
      onStateChange: (updater) => this.updateTableState(props, updater),
      getRowId: props.getRowId,
      getSubRows: props.getSubRows,
      defaultColumn: {
        enableSorting: props.sortable ?? true,
        enableColumnFilter: props.filterable ?? true,
        ...(props.defaultColumn ?? {}),
      },
      meta: props.meta,
      renderFallbackValue: props.renderFallbackValue ?? '',
      manualSorting: props.manualSorting,
      manualFiltering: props.manualFiltering,
      manualPagination: props.manualPagination,
      pageCount: props.pageCount,
      rowCount: props.rowCount,
      enableSorting: props.sortable ?? true,
      enableFilters: props.filterable ?? true,
      enableColumnFilters: props.filterable ?? true,
      enableGlobalFilter: props.filterable ?? true,
      enableRowSelection: props.selectable ?? false,
      enableExpanding: expandedEnabled,
      globalFilterFn: 'includesString',
      getColumnCanGlobalFilter: (column) => {
        if (!column.getCanFilter()) return false
        const sampleRow = props.data?.[0] as Record<string, any> | undefined
        if (!sampleRow) return true
        const value = column.accessorFn ? column.accessorFn(sampleRow, 0) : sampleRow[column.id]
        return typeof value === 'string' || typeof value === 'number'
      },
      getRowCanExpand: () => expandedEnabled,
      getCoreRowModel: getCoreRowModel(),
      getFilteredRowModel: props.manualFiltering ? undefined : getFilteredRowModel(),
      getSortedRowModel: props.manualSorting ? undefined : getSortedRowModel(),
      getExpandedRowModel: expandedEnabled ? getExpandedRowModel() : undefined,
      getPaginationRowModel: props.paginated === false || props.manualPagination ? undefined : getPaginationRowModel(),
    } as any)
  }

  renderTemplate(renderable: any, context: DataGridRenderContext<any> | DataGridRowRenderContext<any>) {
    return renderValue(renderable, context)
  }

  renderLoadingRows(props: DataGridProps<RowData>, densityClasses: Record<string, string>, visibleColumnCount: number) {
    return Array.from({ length: props.loadingRows ?? 5 }).map(() => (
      <tr data-part="loading-row" class={cn('border-b border-border', densityClasses.row)}>
        {Array.from({ length: visibleColumnCount }).map((__, cellIndex) => (
          <td
            data-part="loading-cell"
            class={cn('border-r border-border last:border-r-0', densityClasses.cell, props.bodyCellClass)}
          >
            <div
              class={cn(
                'h-4 animate-pulse rounded bg-muted',
                cellIndex === 0 ? 'w-10' : cellIndex === 1 ? 'w-16' : 'w-full',
              )}
            />
          </td>
        ))}
      </tr>
    ))
  }

  renderDataRows(
    props: DataGridProps<RowData>,
    table: any,
    state: any,
    rows: any[],
    densityClasses: Record<string, string>,
    selectable: boolean,
    expandable: boolean,
    hasRowActions: boolean,
    visibleColumnCount: number,
  ) {
    return rows.map((row: any) => (
      <>
        <tr
          data-part="body-row"
          data-row-id={row.id}
          data-selected={row.getIsSelected?.() ? 'true' : 'false'}
          class={cn(
            'border-b border-border hover:bg-accent/40',
            row.getIsSelected?.() && 'bg-accent/30',
            densityClasses.row,
            props.bodyRowClass,
          )}
        >
          {selectable && (
            <td
              data-part="selection-cell"
              class={cn('border-r border-border align-middle', densityClasses.cell, props.bodyCellClass)}
            >
              <input
                data-part="row-select"
                data-row-id={row.id}
                type="checkbox"
                checked={row.getIsSelected?.()}
                disabled={!row.getCanSelect?.()}
                change={() => row.toggleSelected()}
              />
            </td>
          )}

          {expandable && (
            <td
              data-part="expander-cell"
              class={cn('border-r border-border align-middle', densityClasses.cell, props.bodyCellClass)}
            >
              <button
                data-part="row-expander"
                data-row-id={row.id}
                class="inline-flex h-7 w-7 items-center justify-center rounded border border-input bg-background text-xs hover:bg-accent disabled:opacity-50"
                type="button"
                disabled={!row.getCanExpand?.()}
                click={() => row.toggleExpanded()}
              >
                {row.getIsExpanded?.() ? '-' : '+'}
              </button>
            </td>
          )}

          {row.getVisibleCells().map((cell: any) => (
            <td
              data-part="body-cell"
              data-column-id={cell.column.id}
              class={cn(
                'border-r border-border align-middle text-foreground last:border-r-0',
                densityClasses.cell,
                props.bodyCellClass,
              )}
            >
              {this.renderTemplate(cell.column.columnDef.cell ?? cell.renderValue(), cell.getContext())}
            </td>
          ))}

          {hasRowActions && (
            <td data-part="actions-cell" class={cn('align-middle text-right', densityClasses.cell, props.bodyCellClass)}>
              {this.renderTemplate(props.rowActions, { table, state, row })}
            </td>
          )}
        </tr>

        {row.getIsExpanded?.() && props.expandedRow && (
          <tr data-part="expanded-row" data-row-id={row.id} class="border-b border-border bg-muted/30">
            <td
              data-part="expanded-cell"
              colSpan={visibleColumnCount}
              class={cn('px-4 py-4 text-sm', props.bodyCellClass)}
            >
              {this.renderTemplate(props.expandedRow, { table, state, row })}
            </td>
          </tr>
        )}
      </>
    ))
  }

  renderEmptyRow(
    props: DataGridProps<RowData>,
    context: DataGridRenderContext<RowData>,
    visibleColumnCount: number,
  ) {
    return (
      <tr data-part="empty-row">
        <td
          data-part="empty-cell"
          colSpan={visibleColumnCount}
          class="px-6 py-10 text-center text-sm text-muted-foreground"
        >
          {props.emptyState
            ? this.renderTemplate(props.emptyState, context)
            : (props.emptyMessage ?? 'No rows match the current view.')}
        </td>
      </tr>
    )
  }

  template(props: DataGridProps<RowData>) {
    const table = this.buildTable(props)
    const state = table.getState()
    const density = resolveDensity(props.density ?? this.density)
    const densityClasses = getDensityClasses(density)
    const rows = table.getRowModel().rows
    const leafColumns = table.getVisibleLeafColumns()
    const showGlobalFilter = this.showGlobalFilter
    const showToolbar = props.showToolbar ?? true
    const showColumnVisibility = props.showColumnVisibility ?? true
    const showDensitySelector = props.showDensitySelector ?? true
    const showSelectedCount = props.showSelectedCount ?? Boolean(props.selectable)
    const showResetButton = props.showResetButton ?? true
    const selectable = props.selectable ?? false
    const expandable = props.expandable ?? Boolean(props.expandedRow)
    const hasRowActions = Boolean(props.rowActions)
    const totalRows =
      props.rowCount ?? (props.manualFiltering ? props.data.length : table.getFilteredRowModel().rows.length)
    const paginationState = state.pagination ?? { pageIndex: 0, pageSize: props.defaultPageSize ?? 10 }
    const pageIndex = paginationState.pageIndex ?? 0
    const pageSize = paginationState.pageSize ?? props.defaultPageSize ?? 10
    const rangeStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1
    const rangeEnd = props.paginated === false ? rows.length : Math.min(totalRows, (pageIndex + 1) * pageSize)
    const allColumns = table.getAllLeafColumns()
    const selectedCount = table.getFilteredSelectedRowModel().rows.length
    const context = { table, state }
    const pageSizeOptions = props.pageSizeOptions ?? [10, 20, 50, 100]
    const visibleColumnCount =
      leafColumns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0) + (hasRowActions ? 1 : 0)
    const stickyHeader = props.stickyHeader ?? true

    return (
      <div
        data-part="root"
        data-density={density}
        class={cn('datagrid-root flex flex-col gap-4', props.class, props.rootClass)}
      >
        {showToolbar && (
          <div
            data-part="toolbar"
            class={cn(
              'datagrid-toolbar flex flex-col gap-3 rounded-lg border border-border bg-card p-3 md:flex-row md:items-center md:justify-between',
              props.toolbarClass,
            )}
          >
            <div class="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              {props.toolbarStart && (
                <div data-part="toolbar-start">{this.renderTemplate(props.toolbarStart, context)}</div>
              )}

              {showGlobalFilter && (
                <div class="min-w-0 flex-1 md:max-w-sm">
                  <input
                    data-part="global-filter"
                    class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    type="search"
                    placeholder={props.globalSearchPlaceholder ?? 'Search all columns...'}
                    value={String(state.globalFilter ?? '')}
                    input={(event: any) => this.setGlobalFilter(table, event.target.value)}
                  />
                </div>
              )}

              {showSelectedCount && selectable && (
                <div data-part="selected-count" class="text-sm text-muted-foreground">
                  {selectedCount} selected
                </div>
              )}
            </div>

            <div class="flex flex-wrap items-center gap-2">
              {showColumnVisibility && (
                <div class="relative">
                  <button
                    data-part="column-toggle-trigger"
                    class="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm shadow-sm hover:bg-accent"
                    type="button"
                    click={() => this.toggleColumnPanel()}
                  >
                    Columns
                  </button>

                  {this.showColumnPanel && (
                    <div
                      data-part="column-panel"
                      class="absolute right-0 z-20 mt-2 flex min-w-64 flex-col gap-2 rounded-md border border-border bg-popover p-3 shadow-md"
                    >
                      {allColumns.map((column: any) => (
                        <div
                          data-part="column-panel-item"
                          data-column-id={column.id}
                          class="flex items-center justify-between gap-2"
                        >
                          <label class="flex items-center gap-2 text-sm">
                            <input
                              data-part="column-visibility-checkbox"
                              data-column-id={column.id}
                              type="checkbox"
                              checked={column.getIsVisible()}
                              change={() => column.toggleVisibility()}
                            />
                            <span>
                              {this.renderTemplate(column.columnDef.header ?? column.id, { ...context, column }) ||
                                column.id}
                            </span>
                          </label>
                          {props.reorderableColumns && (
                            <div class="flex items-center gap-1">
                              <button
                                class="inline-flex h-7 w-7 items-center justify-center rounded border border-input bg-background text-xs hover:bg-accent"
                                type="button"
                                click={() => this.moveColumn(table, column.id, -1)}
                              >
                                &#8592;
                              </button>
                              <button
                                class="inline-flex h-7 w-7 items-center justify-center rounded border border-input bg-background text-xs hover:bg-accent"
                                type="button"
                                click={() => this.moveColumn(table, column.id, 1)}
                              >
                                &#8594;
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {showDensitySelector && (
                <div data-part="density-group" class="inline-flex rounded-md border border-input bg-background p-1">
                  {(['compact', 'default', 'comfortable'] as DataGridDensity[]).map((densityOption) => (
                    <button
                      data-part="density-option"
                      data-value={densityOption}
                      class={cn(
                        'rounded px-2 py-1 text-xs capitalize',
                        density === densityOption ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                      )}
                      type="button"
                      click={() => this.setDensityValue(densityOption)}
                    >
                      {densityOption}
                    </button>
                  ))}
                </div>
              )}

              {showResetButton && (
                <button
                  data-part="reset-trigger"
                  class="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm shadow-sm hover:bg-accent"
                  type="button"
                  click={() => table.reset()}
                >
                  Reset
                </button>
              )}

              {props.toolbarEnd && <div data-part="toolbar-end">{this.renderTemplate(props.toolbarEnd, context)}</div>}
            </div>
          </div>
        )}

        <div data-part="table-shell" class="overflow-hidden rounded-lg border border-border bg-card">
          <div class="overflow-auto">
            <table data-part="table" class={cn('datagrid-table min-w-full border-collapse', props.tableClass)}>
              <thead data-part="thead" class={cn(stickyHeader && 'sticky top-0 z-10 bg-card')}>
                {table.getHeaderGroups().map((headerGroup: any) => (
                  <tr data-part="header-row" class={cn('border-b border-border', props.headerRowClass)}>
                    {selectable && headerGroup.depth === 0 && (
                      <th
                        data-part="selection-header"
                        rowSpan={table.getHeaderGroups().length}
                        class={cn(
                          'w-12 align-middle border-r border-border text-left font-medium text-muted-foreground',
                          densityClasses.header,
                          props.headerCellClass,
                        )}
                      >
                        <input
                          data-part="toggle-all-rows"
                          type="checkbox"
                          checked={table.getIsAllPageRowsSelected()}
                          change={() => table.toggleAllPageRowsSelected()}
                        />
                      </th>
                    )}

                    {expandable && headerGroup.depth === 0 && (
                      <th
                        data-part="expander-header"
                        rowSpan={table.getHeaderGroups().length}
                        class={cn(
                          'w-12 align-middle border-r border-border text-left font-medium text-muted-foreground',
                          densityClasses.header,
                          props.headerCellClass,
                        )}
                      >
                        <span class="sr-only">Expand</span>
                      </th>
                    )}

                    {headerGroup.headers.map((header: any) => {
                      const isLeaf = !header.subHeaders?.length
                      const canSort = props.sortable !== false && header.column.getCanSort?.()
                      const sorted = header.column.getIsSorted?.() ?? false

                      return (
                        <th
                          data-part="header-cell"
                          data-column-id={header.column.id}
                          colSpan={header.colSpan}
                          class={cn(
                            'align-top border-r border-border text-left font-medium text-foreground last:border-r-0',
                            stickyHeader && 'bg-card',
                            densityClasses.header,
                            props.headerCellClass,
                          )}
                        >
                          {header.isPlaceholder ? null : (
                            <div class="flex flex-col gap-2">
                              <div class="flex items-center gap-2">
                                {canSort ? (
                                  <button
                                    data-part="sort-trigger"
                                    data-state={sorted || 'none'}
                                    class="inline-flex items-center gap-2 text-left hover:text-primary"
                                    type="button"
                                    click={() => header.column.toggleSorting()}
                                  >
                                    <span>
                                      {this.renderTemplate(
                                        header.column.columnDef.header ?? header.column.id,
                                        header.getContext(),
                                      )}
                                    </span>
                                    <span data-part="sort-indicator" class="text-xs text-muted-foreground">
                                      {getSortIndicator(sorted)}
                                    </span>
                                  </button>
                                ) : (
                                  <span>
                                    {this.renderTemplate(
                                      header.column.columnDef.header ?? header.column.id,
                                      header.getContext(),
                                    )}
                                  </span>
                                )}
                              </div>

                              {isLeaf && props.filterable !== false && header.column.getCanFilter?.() && (
                                <input
                                  data-part="column-filter"
                                  data-column-id={header.column.id}
                                  class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  type="search"
                                  placeholder={`Filter ${header.column.id}...`}
                                  value={String(header.column.getFilterValue?.() ?? '')}
                                  input={(event: any) => this.setColumnFilter(header.column, event.target.value)}
                                />
                              )}
                            </div>
                          )}
                        </th>
                      )
                    })}

                    {hasRowActions && headerGroup.depth === 0 && (
                      <th
                        data-part="actions-header"
                        rowSpan={table.getHeaderGroups().length}
                        class={cn(
                          'w-24 align-middle text-right font-medium text-muted-foreground',
                          densityClasses.header,
                          props.headerCellClass,
                        )}
                      >
                        Actions
                      </th>
                    )}
                  </tr>
                ))}
              </thead>

              <tbody data-part="tbody">
                {props.loading ? (
                  this.renderLoadingRows(props, densityClasses, visibleColumnCount)
                ) : rows.length > 0 ? (
                  this.renderDataRows(
                    props,
                    table,
                    state,
                    rows,
                    densityClasses,
                    selectable,
                    expandable,
                    hasRowActions,
                    visibleColumnCount,
                  )
                ) : (
                  this.renderEmptyRow(props, context, visibleColumnCount)
                )}
              </tbody>
            </table>
          </div>
        </div>

        {(props.paginated ?? true) && (
          <div
            data-part="footer"
            class={cn(
              'datagrid-footer flex flex-col gap-3 rounded-lg border border-border bg-card p-3 md:flex-row md:items-center md:justify-between',
              props.footerClass,
            )}
          >
            <div data-part="range-summary" class="text-sm text-muted-foreground">
              Showing {rangeStart}-{rangeEnd} of {totalRows}
            </div>

            <div class="flex flex-col gap-3 md:flex-row md:items-center">
              <label class="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page</span>
                <select
                  data-part="page-size-select"
                  class="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={String(pageSize)}
                  change={(event: any) => table.setPageSize(Number(event.target.value))}
                >
                  {pageSizeOptions.map((size) => (
                    <option value={String(size)}>{size}</option>
                  ))}
                </select>
              </label>

              <Pagination
                count={totalRows}
                page={pageIndex + 1}
                pageSize={pageSize}
                defaultPageSize={pageSize}
                onPageChange={(details: any) => table.setPageIndex(details.page - 1)}
              />
            </div>
          </div>
        )}
      </div>
    )
  }
}
