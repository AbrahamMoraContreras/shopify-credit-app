'use client'

export default function PaymentDetail() {
  return (
    <s-page heading="Detalles de Pago">
      <s-stack gap="base">
        {/* Metrics */}
        <s-grid
          gridTemplateColumns="repeat(2, 2fr)"
          gap="small"
          justifyContent="center"
          padding="base"
        >
          <s-grid-item gridColumn="span 1" >
            <s-section padding="base">
              <s-heading>Pago #######</s-heading>
              <s-paragraph>Fecha del Pago: #####</s-paragraph>
              <s-paragraph>Monto dle Pago: ######</s-paragraph>
              <s-paragraph>Tasa de Cambio: 100 bs</s-paragraph>
              <s-paragraph>Método de Pago: Efectivo</s-paragraph>
              <s-grid-item gridColumn="span 1" >
                <s-paragraph>Nota: El Pago fue realizado el Mismo Día</s-paragraph>
              </s-grid-item>
            </s-section>
          </s-grid-item>

            <s-section padding="base">
                <s-heading>Información de Contacto</s-heading>
                <s-paragraph>José Perez</s-paragraph>
                <s-paragraph>joseperez@gmail.com</s-paragraph>
                <s-paragraph>0414775845</s-paragraph>
              </s-section>


        </s-grid>

        <s-divider/>

        {/* Products Table */}
        <s-heading>Lista de Productos</s-heading>

        <s-section padding="base">
          <s-table>
            <s-table-header-row>
              <s-table-header>Código de Producto</s-table-header>
              <s-table-header>Fecha de Pago</s-table-header>
              <s-table-header>Producto</s-table-header>
              <s-table-header format="numeric">Monto</s-table-header>
              <s-table-header>Método de Pago</s-table-header>
            </s-table-header-row>
            <s-table-body>
              <s-table-row>
                <s-table-cell>John Smith</s-table-cell>
                <s-table-cell>john@example.com</s-table-cell>
                <s-table-cell>23</s-table-cell>
                <s-table-cell>123-456-7890</s-table-cell>
                <s-table-cell>123-456-7890</s-table-cell>

              </s-table-row>
              <s-table-row>
                <s-table-cell>Jane Johnson</s-table-cell>
                <s-table-cell>jane@example.com</s-table-cell>
                <s-table-cell>15</s-table-cell>
                <s-table-cell>234-567-8901</s-table-cell>
                <s-table-cell>123-456-7890</s-table-cell>

              </s-table-row>
              <s-table-row>
                <s-table-cell>Brandon Williams</s-table-cell>
                <s-table-cell>brandon@example.com</s-table-cell>
                <s-table-cell>42</s-table-cell>
                <s-table-cell>345-678-9012</s-table-cell>
                <s-table-cell>123-456-7890</s-table-cell>

              </s-table-row>
            </s-table-body>
          </s-table>
        </s-section>

          <s-stack padding="base" direction="inline" justifyContent="end">
            <s-button variant="primary" type="button">Enviar por WhatsApp</s-button>
          </s-stack>
      </s-stack>

      {/*Footer*/}
      <s-stack padding="base" alignItems="center">
        <s-text>¿Tienes alguna duda?<s-link href="">Contáctanos</s-link>.</s-text>
      </s-stack>
    </s-page>
  );
}
