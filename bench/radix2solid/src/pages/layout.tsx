import { Box, Flex, Grid, Heading, Text } from '@wsagency/radix2solid-themes'

export default function LayoutPage() {
  return <main class="page-content" data-page="layout">
    <section class="bench-section">
      <Heading as="h2">Layout components</Heading>
      <Box class="panel">Box content</Box>
      <Flex class="demo-row"><Text>Flex item</Text><Text>Another flex item</Text></Flex>
      <Grid class="demo-grid"><Text>Grid item A</Text><Text>Grid item B</Text><Text>Grid item C</Text></Grid>
    </section>
  </main>
}
