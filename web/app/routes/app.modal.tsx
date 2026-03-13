'use client'

export default function Modal() {
  return (
    <s-page heading="Example">
      <s-section>
        {/* Acts like a link that opens the modal */}
        <s-button
          variant="secondary"
          tone="neutral"
          command="--show"
          commandFor="details-modal"
        >
          Learn more
        </s-button>

        {/* Modal that will be shown/hidden via commands */}
        <s-modal id="details-modal" heading="More details">
          <s-section padding="base">
            <s-text>
              TODO: Replace with your modal content.
            </s-text>
          </s-section>

          <s-button
            slot="primary-action"
            command="--hide"
            commandFor="details-modal"
          >
            Close
          </s-button>
        </s-modal>
      </s-section>
    </s-page>
  );
}