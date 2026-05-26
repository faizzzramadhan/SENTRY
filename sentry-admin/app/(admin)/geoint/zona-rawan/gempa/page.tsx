'use client'

import BaseMap
from '../../components/map/BaseMap'

import RiskLayer
from '../../components/map/RiskLayer'

export default function ZonaGempaPage() {

  return (

    <BaseMap>

      <RiskLayer
        type="gempa"
      />

    </BaseMap>
  )
}