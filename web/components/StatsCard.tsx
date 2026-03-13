import { Card, Text, BlockStack } from "@shopify/polaris"

interface StatsCardProps {
  title: string
  value: string | number
}

export function StatsCard({ title, value }: StatsCardProps) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="h2" variant="headingSm" fontWeight="regular">
          {title}
        </Text>
        <Text as="p" variant="heading2xl" fontWeight="bold">
          {value}
        </Text>
      </BlockStack>
    </Card>
  )
}
