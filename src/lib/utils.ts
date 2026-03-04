// 格式化数字，添加千位分隔符
export const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};