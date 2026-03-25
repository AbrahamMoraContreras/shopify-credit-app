'use client'

  export default function CustomerDetail() {
    return (
      <s-page heading="Detalle de Cliente">
        <s-button slot="primary-action" href="" accessibilityLabel="Editar datos del cliente">Editar Cliente</s-button>

        <s-stack gap="base">
          {/* Customer header */}
          <s-grid
              gridTemplateColumns="repeat(3, 1fr)"
              gap="small"
              justifyItems="center"
              padding="base"
          >
            <s-heading justify-content="center">NOMBRE CLIENTE</s-heading>
            <s-heading justify-content="center">EMAIL</s-heading>
            <s-heading justify-content="center">TELEFONO</s-heading>
          </s-grid>

          <s-divider />

          {/* Metrics */}
          <s-grid
            gridTemplateColumns="repeat(4, 2fr)"
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
                <s-heading>Limite de Credito</s-heading>
                  To create your own page and have it show up in the app navigation, add
                  a page inside <code>app/routes</code>, and a link to it in the{" "}
                  <code>&lt;ui-nav-menu&gt;</code> component found in{" "}
              </s-section>
            </s-grid-item>

            <s-grid-item gridColumn="auto">
              <s-section>
                <s-heading>Saldo a Favor</s-heading>
                  To create your own page and have it show up in the app navigation, add
                  a page inside <code>app/routes</code>, and a link to it in the{" "}
                  <code>&lt;ui-nav-menu&gt;</code> component found in{" "}
              </s-section>
            </s-grid-item>

            <s-grid-item gridColumn="auto">
              <s-section>
                <s-heading>Reputación Crediticia</s-heading>
                    To create your own page and have it show up in the app navigation, add
                    a page inside <code>app/routes</code>, and a link to it in the{" "}
                  <code>&lt;ui-nav-menu&gt;</code> component found in{" "}
              </s-section>
            </s-grid-item>
          </s-grid>

          <s-divider />

          {/* Payments table */}

          {/* Payments table */}
          <s-section padding="base" accessibilityLabel="Lista Dashboard">
            <s-table>
              <s-grid slot="filters" gap="small-200" gridTemplateColumns="1fr auto">
                <s-text-field
                  label="Buscar operaciones"
                  labelAccessibilityVisibility="exclusive"
                  icon="search"
                  placeholder="Buscar operaciones"

                />
                <s-button
                  variant="secondary"
                  accessibilityLabel="Filtrar lista de operaciones"
                  interestFor="sort-tooltip"
                  commandFor="sort-actions"
                />
                <s-tooltip id="sort-tooltip">
                  <s-text>Filtrar</s-text>
                </s-tooltip>
                <s-popover id="sort-actions">
                  <s-stack gap="none">
                    <s-box padding="small">
                      <s-choice-list label="Filtrar por" name="Filtrar por">
                        <s-choice value="Fecha" selected>Fecha</s-choice>
                        <s-choice value="pieces">Numero de Orden</s-choice>
                        <s-choice value="created">Monto</s-choice>
                        <s-choice value="status">Estatus de Pago</s-choice>
                        <s-choice value="status">Detalles de Orden</s-choice>
                      </s-choice-list>
                    </s-box>
                    <s-divider />
                  </s-stack>
                </s-popover>
              </s-grid>
              <s-table-header-row>
                <s-table-header listSlot="primary">Fecha</s-table-header>
                <s-table-header listSlot="primary" format="numeric">Número de Orden</s-table-header>
                <s-table-header listSlot="primary" format="numeric">Monto</s-table-header>
                <s-table-header listSlot="secondary">Estatus de Pago</s-table-header>
                <s-table-header listSlot="secondary">Detalles de Orden</s-table-header>
              </s-table-header-row>

              <s-table-body>
                <s-table-row >
                  <s-table-cell>
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-text>15-12-2025</s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>16</s-table-cell>
                  <s-table-cell>Today</s-table-cell>
                  <s-table-cell>
                    <s-badge color="base" tone="success">
                      <s-table-header format="numeric">55</s-table-header>
                    </s-badge>
                  </s-table-cell>
                </s-table-row>

                <s-table-row >
                  <s-table-cell>
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-text>22-10-2025</s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>9</s-table-cell>
                  <s-table-cell>Yesterday</s-table-cell>
                    <s-table-cell>
                      <s-badge color="base" tone="success">
                        <s-table-header format="numeric">55</s-table-header>
                      </s-badge>
                    </s-table-cell>
                </s-table-row>

                <s-table-row>
                  <s-table-cell>
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-text>24-05-2025</s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>25</s-table-cell>
                  <s-table-cell>Last week</s-table-cell>
                  <s-table-cell>
                    <s-badge color="base" tone="success">
                      <s-table-header format="numeric">55</s-table-header>
                    </s-badge>
                  </s-table-cell>
                </s-table-row>
              </s-table-body>
            </s-table>
          </s-section>

          <s-divider/>

          <s-table variant="list">
              <s-grid slot="filters" gap="small-200" gridTemplateColumns="1fr auto">
                <s-text-field
                  label="Buscar operaciones"
                  labelAccessibilityVisibility="exclusive"
                  icon="search"
                  placeholder="Buscar operaciones"

                />
                <s-button
                  variant="secondary"
                  accessibilityLabel="Filtrar lista de historial"
                  interestFor="sort-tooltip"
                  commandFor="sort-actions"
                />
                <s-tooltip id="sort-tooltip">
                  <s-text>Filtrar</s-text>
                </s-tooltip>
                <s-popover id="sort-actions">
                  <s-stack gap="none">
                    <s-box padding="small">
                      <s-choice-list label="Filtrar por" name="Filtrar por">
                        <s-choice value="Fecha" selected>Fecha</s-choice>
                        <s-choice value="pieces">Numero de Orden</s-choice>
                        <s-choice value="created">Monto</s-choice>
                        <s-choice value="status">Estatus de Pago</s-choice>
                        <s-choice value="status">Detalles de Orden</s-choice>
                      </s-choice-list>
                    </s-box>
                    <s-divider />
                  </s-stack>
                </s-popover>
              </s-grid>
              <s-table-header-row>
                <s-table-header listSlot="primary">Fecha</s-table-header>
                <s-table-header format="numeric">Número de Orden</s-table-header>
                <s-table-header format="numeric">Monto</s-table-header>
                <s-table-header listSlot="secondary">Estatus de Pago</s-table-header>
                <s-table-header listSlot="secondary">Detalles de Orden</s-table-header>
              </s-table-header-row>

              <s-table-body>
                <s-table-row >
                  <s-table-cell>
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-text>15-12-2025</s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>16</s-table-cell>
                  <s-table-cell>Today</s-table-cell>
                  <s-table-cell>
                    <s-badge color="base" tone="success">
                      <s-table-header format="numeric">55</s-table-header>
                    </s-badge>
                  </s-table-cell>
                </s-table-row>

                <s-table-row >
                  <s-table-cell>
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-text>22-10-2025</s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>9</s-table-cell>
                  <s-table-cell>Yesterday</s-table-cell>
                    <s-table-cell>
                      <s-badge color="base" tone="success">
                        <s-table-header format="numeric">55</s-table-header>
                      </s-badge>
                    </s-table-cell>
                </s-table-row>

                <s-table-row>
                  <s-table-cell>
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-text>24-05-2025</s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>25</s-table-cell>
                  <s-table-cell>Last week</s-table-cell>
                  <s-table-cell>
                    <s-badge color="base" tone="success">
                      <s-table-header format="numeric">55</s-table-header>
                    </s-badge>
                  </s-table-cell>
                </s-table-row>
              </s-table-body>
            </s-table>

          {/*Footer*/}
          <s-stack padding="base" alignItems="center">
            <s-text>¿Tienes alguna duda?<s-link href="">Contáctanos</s-link>.</s-text>
          </s-stack>

        </s-stack>
      </s-page>
    );
  }
