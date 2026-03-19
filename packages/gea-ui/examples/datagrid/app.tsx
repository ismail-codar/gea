import { Component } from '@geajs/core'
import type { ColumnDef } from '@geajs/ui'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataGrid } from '@geajs/ui'

type Order = {
  id: string
  customer: string
  email: string
  plan: string
  region: string
  seats: number
  spend: number
  status: 'Active' | 'Review' | 'Paused'
  lastInvoice: string
  notes: string
}

export default class App extends Component {
  density: 'compact' | 'default' | 'comfortable' = 'default'

  orders: Order[] = [
    {
      id: 'ORD-1024',
      customer: 'Northwind Labs',
      email: 'ops@northwind.dev',
      plan: 'Enterprise',
      region: 'US-East',
      seats: 42,
      spend: 12400,
      status: 'Active',
      lastInvoice: '2026-03-12',
      notes: 'Priority support and SSO enabled.',
    },
    {
      id: 'ORD-1025',
      customer: 'Bluepeak Studio',
      email: 'billing@bluepeak.studio',
      plan: 'Growth',
      region: 'Europe',
      seats: 18,
      spend: 4860,
      status: 'Review',
      lastInvoice: '2026-03-10',
      notes: 'Awaiting PO confirmation for renewal.',
    },
    {
      id: 'ORD-1026',
      customer: 'Kitebridge Health',
      email: 'finance@kitebridge.health',
      plan: 'Starter',
      region: 'US-West',
      seats: 9,
      spend: 1320,
      status: 'Paused',
      lastInvoice: '2026-02-28',
      notes: 'Temporarily paused while team restructures.',
    },
    {
      id: 'ORD-1027',
      customer: 'Summit Grid',
      email: 'hello@summitgrid.io',
      plan: 'Enterprise',
      region: 'APAC',
      seats: 57,
      spend: 16750,
      status: 'Active',
      lastInvoice: '2026-03-15',
      notes: 'Requested expanded audit logs.',
    },
    {
      id: 'ORD-1028',
      customer: 'Pine & Pixel',
      email: 'admin@pinepixel.co',
      plan: 'Growth',
      region: 'Europe',
      seats: 24,
      spend: 6120,
      status: 'Active',
      lastInvoice: '2026-03-11',
      notes: 'Healthy account with quarterly billing.',
    },
    {
      id: 'ORD-1029',
      customer: 'Atlas Forge',
      email: 'team@atlasforge.com',
      plan: 'Growth',
      region: 'US-Central',
      seats: 31,
      spend: 7420,
      status: 'Review',
      lastInvoice: '2026-03-08',
      notes: 'Pending approval for extra workspace seats.',
    },
  ]

  columns: ColumnDef<Order>[] = [
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <div class="customer-cell">
          <div class="customer-name">{row.original.customer}</div>
          <div class="customer-email">{row.original.email}</div>
        </div>
      ),
    },
    { accessorKey: 'plan', header: 'Plan' },
    { accessorKey: 'region', header: 'Region' },
    {
      accessorKey: 'seats',
      header: 'Seats',
      cell: ({ row }) => <span class="numeric-cell">{row.original.seats}</span>,
    },
    {
      accessorKey: 'spend',
      header: 'MRR',
      cell: ({ row }) => <span class="numeric-cell">${row.original.spend.toLocaleString()}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={this.getStatusVariant(row.original.status)}>{row.original.status}</Badge>
      ),
    },
    { accessorKey: 'lastInvoice', header: 'Last Invoice' },
  ]

  getStatusVariant(status: Order['status']) {
    if (status === 'Paused') return 'destructive'
    if (status === 'Review') return 'secondary'
    return 'outline'
  }

  template() {
    return (
      <div class="datagrid-page">
        <div class="hero">
          <div>
            <p class="eyebrow">gea-ui example</p>
            <h1>DataGrid</h1>
            <p class="hero-copy">
              Sort, filter, paginate, toggle columns, change density, and expand rows with a realistic account table.
            </p>
          </div>
          <div class="hero-stats">
            <div>
              <span class="stat-label">Accounts</span>
              <strong>6</strong>
            </div>
            <div>
              <span class="stat-label">Monthly Revenue</span>
              <strong>$48,870</strong>
            </div>
          </div>
        </div>

        <Card class="example-shell">
          <CardHeader class="example-header">
            <div>
              <CardTitle>Revenue Accounts</CardTitle>
              <CardDescription>
                This example uses client-side filtering, sorting, selection, expansion, and column reordering.
              </CardDescription>
            </div>
            <Button variant="outline" click={() => (this.density = this.density === 'comfortable' ? 'compact' : 'comfortable')}>
              Toggle Density
            </Button>
          </CardHeader>
          <CardContent>
            <DataGrid
              data={this.orders}
              columns={this.columns}
              density={this.density}
              selectable
              expandable
              reorderableColumns
              defaultPageSize={5}
              pageSizeOptions={[5, 10, 20]}
              globalSearchPlaceholder="Search customers, regions, or plan..."
              toolbarStart={
                <div class="toolbar-copy">
                  <strong>Sales Ops</strong>
                  <span>Watch account health before renewal.</span>
                </div>
              }
              toolbarEnd={
                <Button size="sm" variant="secondary">
                  Export CSV
                </Button>
              }
              rowActions={({ row }) => (
                <Button size="sm" variant="ghost">
                  Open
                </Button>
              )}
              expandedRow={({ row }) => (
                <div class="expanded-panel">
                  <div>
                    <span class="panel-label">Account</span>
                    <strong>{row.original.id}</strong>
                  </div>
                  <div>
                    <span class="panel-label">Owner Note</span>
                    <p>{row.original.notes}</p>
                  </div>
                </div>
              )}
              emptyState={
                <div class="empty-state">
                  <strong>No matching accounts</strong>
                  <span>Adjust filters or reset the current table state.</span>
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>
    )
  }
}
