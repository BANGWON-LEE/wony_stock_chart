import React from 'react'
import { Link } from 'react-router-dom'

type MovePageProps = {
  to: string
  text: string
}

export function MovePage(props: MovePageProps) {
  const { to, text } = props

  return (
    <React.Fragment>
      <Link to={to}>{text}</Link>
    </React.Fragment>
  )
}
