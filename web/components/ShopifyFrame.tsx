"use client"

import { Frame, Navigation, TopBar } from "@shopify/polaris"
import {
  HomeIcon,
  OrderIcon,
  ProductIcon,
  CustomersIcon,
  ContentIcon,
  FinancesIcon,
  AnalyticsIcon,
  MarketingIcon,
  DiscountIcon,
} from "@shopify/polaris-icons"
import { useState } from "react"
import type { ReactNode } from "react"
import { useNavigate } from "@remix-run/react"

interface ShopifyFrameProps {
  children: ReactNode
}

export function ShopifyFrame({ children }: ShopifyFrameProps) {
  const navigate = useNavigate()
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false)
  const [userMenuActive, setUserMenuActive] = useState(false)

  const toggleMobileNavigationActive = () =>
    setMobileNavigationActive((mobileNavigationActive) => !mobileNavigationActive)

  const toggleUserMenuActive = () => setUserMenuActive((userMenuActive) => !userMenuActive)

  const userMenuMarkup = (
    <TopBar.UserMenu
      actions={[
        {
          items: [{ content: "Configuración" }],
        },
      ]}
      name="Stellar Interiors"
      initials="SI"
      open={userMenuActive}
      onToggle={toggleUserMenuActive}
    />
  )

  const searchFieldMarkup = <TopBar.SearchField onChange={() => {}} value="" placeholder="Buscar" />

  const topBarMarkup = <TopBar showNavigationToggle userMenu={userMenuMarkup} searchField={searchFieldMarkup} />

  const navigationMarkup = (
    <Navigation location="/">
      <Navigation.Section
        items={[
          {
            label: "Home",
            icon: HomeIcon,
            onClick: () => {},
          },
          {
            label: "Orders",
            icon: OrderIcon,
            badge: "15",
            onClick: () => {},
          },
          {
            label: "Products",
            icon: ProductIcon,
            onClick: () => {},
          },
          {
            label: "Customers",
            icon: CustomersIcon,
            onClick: () => {},
          },
          {
            label: "Content",
            icon: ContentIcon,
            onClick: () => {},
          },
          {
            label: "Finances",
            icon: FinancesIcon,
            onClick: () => {},
          },
          {
            label: "Analytics",
            icon: AnalyticsIcon,
            onClick: () => {},
          },
          {
            label: "Marketing",
            icon: MarketingIcon,
            onClick: () => {},
          },
          {
            label: "Discounts",
            icon: DiscountIcon,
            onClick: () => {},
          },
        ]}
      />
      <Navigation.Section
        title="Apps"
        items={[
          {
            label: "Credito App",
            icon: FinancesIcon,
            subNavigationItems: [
              {
                label: "Home",
                onClick: () => navigate("/"),
              },
              {
                label: "Pagos",
                onClick: () => navigate("/pagos"),
              },
              {
                label: "Registrar Pagos",
                onClick: () => navigate("/payments/new"),
              },
              {
                label: "Ajustes",
                onClick: () => navigate("/ajustes"),
              },
            ],
          },
        ]}
      />
    </Navigation>
  )

  return (
    <Frame
      topBar={topBarMarkup}
      navigation={navigationMarkup}
      showMobileNavigation={mobileNavigationActive}
      onNavigationDismiss={toggleMobileNavigationActive}
    >
      {children}
    </Frame>
  )
}
