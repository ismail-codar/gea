import { functionalUpdate } from '@tanstack/table-core'
import type { DataGridDensity, DataGridProps, DataGridState } from './types'

const DEFAULT_PAGE_SIZE = 10

export function createInitialDataGridState<TData>(props: DataGridProps<TData>): DataGridState {
  const initialPageSize =
    props.state?.pagination?.pageSize ??
    props.initialState?.pagination?.pageSize ??
    props.defaultPageSize ??
    DEFAULT_PAGE_SIZE

  return {
    sorting: props.initialState?.sorting ?? [],
    columnFilters: props.initialState?.columnFilters ?? [],
    globalFilter: props.initialState?.globalFilter ?? '',
    rowSelection: props.initialState?.rowSelection ?? {},
    expanded: props.initialState?.expanded ?? {},
    columnVisibility: props.initialState?.columnVisibility ?? {},
    columnOrder: props.initialState?.columnOrder ?? [],
    columnPinning: props.initialState?.columnPinning ?? { left: [], right: [] },
    pagination: {
      pageIndex: props.initialState?.pagination?.pageIndex ?? 0,
      pageSize: initialPageSize,
      ...(props.initialState?.pagination ?? {}),
    },
  }
}

export function normalizeDataGridState(state?: DataGridState): DataGridState {
  return {
    sorting: state?.sorting ?? [],
    columnFilters: state?.columnFilters ?? [],
    globalFilter: state?.globalFilter ?? '',
    rowSelection: state?.rowSelection ?? {},
    expanded: state?.expanded ?? {},
    columnVisibility: state?.columnVisibility ?? {},
    columnOrder: state?.columnOrder ?? [],
    columnPinning: state?.columnPinning ?? { left: [], right: [] },
    pagination: {
      pageIndex: state?.pagination?.pageIndex ?? 0,
      pageSize: state?.pagination?.pageSize ?? DEFAULT_PAGE_SIZE,
      ...(state?.pagination ?? {}),
    },
  }
}

export function mergeDataGridState(internalState: DataGridState, controlledState?: DataGridState): DataGridState {
  const normalizedInternal = normalizeDataGridState(internalState)
  const normalizedControlled = normalizeDataGridState(controlledState)

  const internalPagination = normalizedInternal.pagination
  const controlledPagination = normalizedControlled.pagination

  return {
    ...normalizedInternal,
    ...normalizedControlled,
    pagination: {
      pageIndex: controlledPagination?.pageIndex ?? internalPagination.pageIndex,
      pageSize: controlledPagination?.pageSize ?? internalPagination.pageSize,
    },
  }
}

export function applyStateUpdater(state: DataGridState, updater: any): DataGridState {
  return functionalUpdate(updater, state as any) as DataGridState
}

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items.slice()
  }

  const next = items.slice()
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

export function resolveDensity(value?: DataGridDensity): DataGridDensity {
  return value ?? 'default'
}

export function renderValue(renderable: any, context: any) {
  return typeof renderable === 'function' ? renderable(context) : renderable
}

export function getDensityClasses(density: DataGridDensity) {
  switch (density) {
    case 'compact':
      return {
        row: 'h-9',
        cell: 'px-3 py-2 text-xs',
        header: 'px-3 py-2 text-xs',
      }
    case 'comfortable':
      return {
        row: 'h-14',
        cell: 'px-4 py-4 text-sm',
        header: 'px-4 py-4 text-sm',
      }
    default:
      return {
        row: 'h-11',
        cell: 'px-4 py-3 text-sm',
        header: 'px-4 py-3 text-sm',
      }
  }
}

export function getSortIndicator(direction: false | 'asc' | 'desc') {
  if (direction === 'asc') return '↑'
  if (direction === 'desc') return '↓'
  return '↕'
}
