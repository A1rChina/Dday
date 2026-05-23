/**
 * 根据产品名称识别该产品是在哪个实体工厂制造，并返回对应的逻辑仓库代码：
 * - “右边梁” 在重庆工厂制造，对应仓库为 CQ_WH (重庆仓)
 * - “纵梁”、“安装梁1”、“前边梁” 由外协单位制造，对应仓库为 SUB_WH (外协仓)
 * - 其他件（左边梁、后边梁、横梁1、横梁2）在宜宾工厂制造，对应仓库为 YB_WH (宜宾仓)
 */
export function getWarehouseForProduct(productName: string): string {
  if (productName.includes('右边梁')) {
    return 'CQ_WH';
  }
  if (
    productName.includes('纵梁') ||
    productName.includes('安装梁1') ||
    productName.includes('前边梁')
  ) {
    return 'SUB_WH';
  }
  // 左边梁、后边梁、横梁1、横梁2 等产品
  return 'YB_WH';
}
