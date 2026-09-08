import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

// 主要導線 1 本（docs/development-guidelines.md §5.2）:
// New Project → Add Nodes → Connect → Edit → Save → Open → Generate Prompt
//
// **この導線が通らない状態で main へマージしない。**
// Canvas 操作の網羅的な E2E は書かない。種別ごとの接続ルールや分岐編集の細部は
// Unit テスト（domain の純関数）が担保する。

const NODE_KIND_DND_MIME = 'application/gooya-canvas-node-kind'

/**
 * Palette から Canvas への追加。
 *
 * Playwright の dragAndDrop はマウスイベントを合成するだけで HTML5 DnD の
 * dataTransfer を運ばないため、Palette が dragstart で載せる値を直接組み立てて
 * drop を発火させる。Palette 側の dragstart は Unit テストの範囲外だが、
 * MIME と値の取り決めはこの定数で一致していることが担保される。
 */
async function dropNode(
  page: Page,
  kind: string,
  position: { x: number; y: number },
): Promise<void> {
  await page.evaluate(
    ({ kind, position, mime }) => {
      const pane = document.querySelector('.react-flow')
      if (!pane) throw new Error('Canvas が見つかりません')

      const dataTransfer = new DataTransfer()
      dataTransfer.setData(mime, kind)
      pane.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          clientX: position.x,
          clientY: position.y,
          dataTransfer,
        }),
      )
    },
    { kind, position, mime: NODE_KIND_DND_MIME },
  )
}

/** Handle 同士をドラッグして接続する。React Flow は実マウス操作で反応する。 */
async function connect(
  page: Page,
  sourceSelector: string,
  targetSelector: string,
): Promise<void> {
  const source = await page.locator(sourceSelector).boundingBox()
  const target = await page.locator(targetSelector).boundingBox()
  if (!source || !target) throw new Error('Handle が見つかりません')

  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    target.x + target.width / 2,
    target.y + target.height / 2,
    { steps: 12 },
  )
  await page.mouse.up()
}

test('主要導線: New → Add → Connect → Edit → Save → Open → Generate Prompt', async ({
  page,
}) => {
  await page.goto('./')

  // --- 初回起動時はサンプルが読み込まれている（FR-015 / §7.6） ---
  await expect(page.getByText('Interview Evaluation Reminder')).toBeVisible()
  const sampleNodes = page.locator('.react-flow__node')
  await expect(sampleNodes).toHaveCount(11)

  // 描画されていること。React Flow は測定が済むまで visibility: hidden で伏せるため、
  // 「要素が存在する」だけでは見えているとは限らない
  await expect(sampleNodes.first()).toBeVisible()
  await expect(sampleNodes.last()).toBeVisible()

  // 全体が収まる倍率まで引かれていること。サンプルは横に約 2400px 広がるので、
  // 測定前に fit すると実測 0 の矩形に合わせて最大倍率まで寄ってしまう
  const initialZoom = await page.evaluate(() => {
    const transform = document.querySelector<HTMLElement>(
      '.react-flow__viewport',
    )?.style.transform
    return Number(transform?.match(/scale\(([\d.]+)\)/)?.[1] ?? NaN)
  })
  expect(initialZoom).toBeLessThan(1)

  // --- New Project（FR-011） ---
  // サンプル読込直後は dirty ではないので確認ダイアログは挟まらない
  await page.getByRole('button', { name: 'File' }).click()
  await page.getByRole('menuitem', { name: 'New' }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(0)

  // --- Add Nodes（FR-001） ---
  await dropNode(page, 'trigger', { x: 520, y: 200 })
  await dropNode(page, 'end', { x: 520, y: 460 })
  await expect(page.locator('.react-flow__node')).toHaveCount(2)

  // --- Connect（FR-007） ---
  await connect(
    page,
    '.react-flow__node-trigger .react-flow__handle-bottom',
    '.react-flow__node-end .react-flow__handle-top',
  )
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)

  // --- Edit（FR-009 / AC-010 / AC-011） ---
  await page.locator('.react-flow__node-trigger').click()
  const nameField = page.getByLabel('Name')
  await expect(nameField).toHaveValue('Trigger')

  await nameField.fill('面接終了')
  // 編集が即座に Canvas へ反映される（AC-011）
  await expect(page.locator('.react-flow__node-trigger')).toContainText(
    '面接終了',
  )

  // 未保存の変更が Status Bar に出る
  await expect(page.getByText('未保存の変更があります')).toBeVisible()

  // --- Save Project（FR-012 / AC-012） ---
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'File' }).click()
  await page.getByRole('menuitem', { name: 'Save Project' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/\.gooya-canvas\.json$/)
  const savedPath = await download.path()
  const saved = JSON.parse(readFileSync(savedPath, 'utf-8'))
  expect(saved.schemaVersion).toBe('1.0')
  expect(saved.nodes).toHaveLength(2)
  expect(saved.edges).toHaveLength(1)

  // 保存すると dirty が倒れる
  await expect(page.getByText('変更はありません')).toBeVisible()

  // --- Open Project（FR-013 / AC-013 / AC-014） ---
  // 一度まっさらにしてから読み直し、保存内容が復元されることを確かめる
  await page.getByRole('button', { name: 'File' }).click()
  await page.getByRole('menuitem', { name: 'New' }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(0)

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'File' }).click()
  await page.getByRole('menuitem', { name: 'Open Project' }).click()
  await (await fileChooserPromise).setFiles(savedPath)

  await expect(page.locator('.react-flow__node')).toHaveCount(2)
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)
  // 読込前後で設定が一致する（AC-014）
  await expect(page.locator('.react-flow__node-trigger')).toContainText(
    '面接終了',
  )

  // --- Generate Prompt（FR-019 / FR-021 / AC-020〜AC-022） ---
  await page.getByRole('button', { name: 'Generate Prompt' }).click()
  const panel = page.getByRole('dialog')
  await expect(panel).toBeVisible()

  const prompt = panel.locator('pre')
  await expect(prompt).toContainText('# 実装依頼')
  // 編集した Node 設定が Prompt へ反映される（AC-022）
  await expect(prompt).toContainText('面接終了')
  await expect(prompt).toContainText('Implementation target: Generic')

  // Target を変えると即時に再生成される（FR-021 / §9.3）
  await panel
    .getByLabel('Implementation target')
    .selectOption('google-apps-script')
  await expect(prompt).toContainText(
    'Implementation target: Google Apps Script',
  )
})
