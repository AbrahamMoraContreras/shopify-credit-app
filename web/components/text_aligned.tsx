export function RightAlignedTextExamples() {
    return (
      <s-page heading="Text alignment examples">
          <s-section heading="Right edge aligned paragraph">
            <s-stack direction="inline" justifyContent="end">
              <s-box maxInlineSize="60%">
                <s-text>
                  Esta es una frase más larga para mostrar cómo se ve el texto cuando
                  su contenedor está alineado a la derecha. Las líneas siguen
                  alineadas a la izquierda, pero el bloque completo se pega al lado
                  derecho.
                </s-text>
              </s-box>
            </s-stack>
          </s-section>
      </s-page>
    );
  }