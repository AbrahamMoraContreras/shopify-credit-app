'use client'
  //import { MetricCard } from "./app.MetricCard";

  export default function Dashboard() {
    return (
      <s-page heading="Panel Principal">
        <s-button slot="primary-action">Seleccionar Tasa de Cambio</s-button>
        <s-button slot="secondary-actions">XXXX</s-button>
        <s-button slot="secondary-actions">XXXX</s-button>

        <s-stack gap="base">

          {/* Metrics */}
          <s-grid
            gridTemplateColumns="repeat(3, 2fr)"
            gap="small"
            justifyContent="center"
            padding="base"
          >
            <s-grid-item gridColumn="span 1" >
            <s-section>
              <s-heading>Dinero Total en Deudas:</s-heading>
                To create your own page and have it show up in the app navigation, add
                a page inside <code>app/routes</code>, and a link to it in the{" "}
                <code>&lt;ui-nav-menu&gt;</code> component found in{" "}
              </s-section>
            </s-grid-item>

            <s-grid-item gridColumn="auto" >
              <s-section>
                <s-heading>Clientes con Deuda</s-heading>
                  To create your own page and have it show up in the app navigation, add
                  a page inside <code>app/routes</code>, and a link to it in the{" "}
                  <code>&lt;ui-nav-menu&gt;</code> component found in{" "}
                </s-section>
            </s-grid-item>

            <s-grid-item gridColumn="auto" >
              <s-section>
                <s-heading>Morosos</s-heading>
                  To create your own page and have it show up in the app navigation, add
                  a page inside <code>app/routes</code>, and a link to it in the{" "}
                  <code>&lt;ui-nav-menu&gt;</code> component found in{" "}
                </s-section>
            </s-grid-item>
          </s-grid>

          {/* Payments table */}
          <s-section padding="base" accessibilityLabel="Lista Dashboard">
            <s-table >
              <s-grid slot="filters" gap="small-200" gridTemplateColumns="1fr auto">
                <s-text-field
                  label="Search puzzles"
                  labelAccessibilityVisibility="exclusive"
                  icon="search"
                  placeholder="Searching all puzzles"
                />
                <s-button

                  variant="secondary"
                  accessibilityLabel="Sort"
                  interestFor="sort-tooltip"
                  commandFor="sort-actions"
                />
                <s-tooltip id="sort-tooltip">
                  <s-text>Sort</s-text>
                </s-tooltip>
                <s-popover id="sort-actions">
                  <s-stack gap="none">
                    <s-box padding="small">
                      <s-choice-list label="Sort by" name="Sort by">
                        <s-choice value="puzzle-name" selected>
                          Puzzle name
                        </s-choice>
                        <s-choice value="pieces">Pieces</s-choice>
                        <s-choice value="created">Created</s-choice>
                        <s-choice value="status">Status</s-choice>
                      </s-choice-list>
                    </s-box>
                    <s-divider />
                    <s-box padding="small">
                      <s-choice-list label="Order by" name="Order by">
                        <s-choice value="product-title" selected>
                          A-Z
                        </s-choice>
                        <s-choice value="created">Z-A</s-choice>
                      </s-choice-list>
                    </s-box>
                  </s-stack>
                </s-popover>
              </s-grid>
              <s-table-header-row>
                <s-table-header listSlot="primary">Cliente</s-table-header>
                <s-table-header format="numeric">Ordenes Pendientes</s-table-header>
                <s-table-header>Deudas Pendientes</s-table-header>
                <s-table-header listSlot="secondary">Saldo a Favor</s-table-header>
                <s-table-header listSlot="secondary">Ordenes</s-table-header>
              </s-table-header-row>

              <s-table-body>
                <s-table-row >

                  <s-table-cell>
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-paragraph>mPOUNTAIN Sunset</s-paragraph>
                    </s-stack>
                  </s-table-cell>

                  <s-table-cell>16</s-table-cell>

                  <s-table-cell>Today</s-table-cell>

                  <s-table-cell>
                    <s-badge color="base" tone="success">
                      <s-table-header format="numeric">55</s-table-header>
                    </s-badge>
                  </s-table-cell>

                  <s-table-cell>
                      <s-link href="/app/order_detail">
                        <s-paragraph color="subdued">
                          Ver Orden
                        </s-paragraph>
                      </s-link>
                  </s-table-cell>

                </s-table-row>

                <s-table-row >
                  <s-table-cell>
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-paragraph>Ocean Sunset</s-paragraph>
                    </s-stack>
                  </s-table-cell>

                  <s-table-cell>9</s-table-cell>

                  <s-table-cell>Yesterday</s-table-cell>

                  <s-table-cell>
                    <s-badge color="base" tone="success">
                      <s-table-header format="numeric">55</s-table-header>
                    </s-badge>
                  </s-table-cell>

                  <s-table-cell>
                      <s-link href="/app/routes ">
                        <s-paragraph color="subdued">
                          Ver Orden
                        </s-paragraph>
                      </s-link>
                  </s-table-cell>
                </s-table-row>

                <s-table-row>
                  <s-table-cell>
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-paragraph>Ocean Sunset</s-paragraph>
                    </s-stack>
                  </s-table-cell>

                  <s-table-cell>25</s-table-cell>

                  <s-table-cell>Last week</s-table-cell>

                  <s-table-cell>
                    <s-badge color="base" tone="success">
                      <s-table-header format="numeric">55</s-table-header>
                    </s-badge>
                  </s-table-cell>

                  <s-table-cell>
                      <s-link href=" ">
                        <s-paragraph color="subdued">
                          Ver Orden
                        </s-paragraph>
                      </s-link>
                  </s-table-cell>

                </s-table-row>
              </s-table-body>
            </s-table>
          </s-section>

          {/*Footer*/}
          <s-stack padding="base" alignItems="center">
            <s-text>¿Tienes alguna duda?<s-link href="">Contáctanos</s-link>.</s-text>
          </s-stack>
        </s-stack>
      </s-page>
    );
  }
