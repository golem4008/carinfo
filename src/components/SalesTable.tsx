import React, { useState, useEffect } from 'react';
import { CarCompany } from '../types';
import { carCompanies, monthlySalesData2024, getLatestModelPrice } from '../mocks/data';
import { motion } from 'framer-motion';
import { getBrandSalesTableData, formatMonthWithYear } from '../mocks/data';
import CarCompanySelector from './CarCompanySelector';
import { DateRange } from '../types';

interface SalesTableProps {
  className?: string;
  dateRange?: DateRange;
}

interface ManufacturerSpan {
  manufacturer: string;
  startIndex: number;
  span: number;
}

// 定义数据显示类型
type DataType = 'sales' | 'mom' | 'yoy';

const SalesTable: React.FC<SalesTableProps> = ({ className = '', dateRange }) => {
  const [tableData, setTableData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  // 使用CarCompany类型的数组，与其他模块保持一致
  const [selectedCompanies, setSelectedCompanies] = useState<CarCompany[]>(carCompanies);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  // 从数据中提取的月份列表
  const [months, setMonths] = useState<string[]>([]);
  // 用于存储带有年份的月份显示格式
  const [formattedMonths, setFormattedMonths] = useState<Record<string, string>>({});
  // 用于跟踪厂商单元格的合并信息
  const [manufacturerSpans, setManufacturerSpans] = useState<ManufacturerSpan[]>([]);
  // 数据显示类型选择
  const [selectedDataTypes, setSelectedDataTypes] = useState<DataType[]>(['sales', 'mom', 'yoy']);
  // 控制是否显示品牌信息
  const [showBrand, setShowBrand] = useState<boolean>(true);
  
  // 初始化表格数据
  useEffect(() => {
    const data = getBrandSalesTableData(dateRange);
    
    // 从数据中提取所有月份
    const allMonths = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key.includes('-') && key.split('-')[1].endsWith('月')) {
          allMonths.add(key);
        }
      });
    });
    
    // 排序月份
    const sortedMonths = Array.from(allMonths).sort((a, b) => {
      const [yearA, monthA] = a.split('-');
      const [yearB, monthB] = b.split('-');
      if (parseInt(yearA) !== parseInt(yearB)) {
        return parseInt(yearA) - parseInt(yearB);
      }
      const monthNumA = parseInt(monthA.replace('月', ''));
      const monthNumB = parseInt(monthB.replace('月', ''));
      return monthNumA - monthNumB;
    });
    
    // 为每个月添加年份格式
    const formattedMonthsMap: Record<string, string> = {};
    sortedMonths.forEach(month => {
      const [year, monthName] = month.split('-');
      const monthNum = parseInt(monthName.replace('月', ''));
      formattedMonthsMap[month] = formatMonthWithYear(monthNum.toString(), parseInt(year));
    });
    
    setMonths(sortedMonths);
    setFormattedMonths(formattedMonthsMap);
     
    // 计算环比和同比数据
    const dataWithGrowthRates = calculateGrowthRates(data, sortedMonths);
    
    // 先将相同厂商的品牌分类放在一起，不按销量排序
    // 计算每个厂商的总销量
    const manufacturerTotals = new Map<string, number>();
    dataWithGrowthRates.forEach(item => {
      const total = months.reduce((sum, month) => sum + (item[month] || 0), 0);
      if (manufacturerTotals.has(item.manufacturer)) {
        manufacturerTotals.set(item.manufacturer, manufacturerTotals.get(item.manufacturer)! + total);
      } else {
        manufacturerTotals.set(item.manufacturer, total);
      }
    });

    // 按厂商总销量降序排序，相同厂商的品牌放在一起
    const sortedData = [...dataWithGrowthRates].sort((a, b) => {
      // 先按厂商总销量降序排序
      const totalA = manufacturerTotals.get(a.manufacturer) || 0;
      const totalB = manufacturerTotals.get(b.manufacturer) || 0;
      
      if (totalA !== totalB) {
        return totalB - totalA; // 降序排列
      }
      
      // 厂商总销量相同时，按厂商名称排序
      return a.manufacturer.localeCompare(b.manufacturer);
    });
    
    setTableData(sortedData);
  }, [dateRange]);

  // 筛选数据 - 根据选中的公司进行筛选，并确保相同厂商的行放在一起且按销量排序
  useEffect(() => {
    if (selectedCompanies.length === 0) {
      setFilteredData([]);
      return;
    }
    
    // 获取选中公司的名称列表
    const selectedCompanyNames = selectedCompanies.map(company => company.name);
    
    // 筛选出属于选中公司的数据
    let filtered = tableData.filter(item => 
      selectedCompanyNames.includes(item.manufacturer)
    );
    
    // 如果不显示品牌，则聚合厂商数据
    if (!showBrand) {
      filtered = aggregateByManufacturer(filtered);
    } else {
      // 显示品牌时，确保相同厂商的行放在一起，然后按厂商总销量排序
      // 计算每个厂商的总销量
      const manufacturerTotals = new Map<string, number>();
      filtered.forEach(item => {
        const total = months.reduce((sum, month) => sum + (item[month] || 0), 0);
        if (manufacturerTotals.has(item.manufacturer)) {
          manufacturerTotals.set(item.manufacturer, manufacturerTotals.get(item.manufacturer)! + total);
        } else {
          manufacturerTotals.set(item.manufacturer, total);
        }
      });

      // 按厂商总销量降序排序，相同厂商的品牌放在一起
      filtered.sort((a, b) => {
        // 先按厂商总销量降序排序
        const totalA = manufacturerTotals.get(a.manufacturer) || 0;
        const totalB = manufacturerTotals.get(b.manufacturer) || 0;
        
        if (totalA !== totalB) {
          return totalB - totalA; // 降序排列
        }
        
        // 厂商总销量相同时，按厂商名称排序
        return a.manufacturer.localeCompare(b.manufacturer);
      });
    }
    
    setFilteredData(filtered);
  }, [selectedCompanies, tableData, showBrand, months]);

  // 排序数据
  useEffect(() => {
    // 当有排序配置时，根据排序配置排序数据
    if (sortConfig) {
      let sortedData = [...tableData];
      sortedData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        // 如果排序字段值相同，确保相同厂商的记录仍然相邻
        if (a.manufacturer !== b.manufacturer) {
          return a.manufacturer.localeCompare(b.manufacturer);
        }
        return a.brand.localeCompare(b.brand);
      });
      setFilteredData(sortedData);
    } else {
      // 没有排序配置时，先将相同厂商的品牌分类放在一起，再按厂商总销量降序排序
      // 计算每个厂商的总销量
      const manufacturerTotals = new Map<string, number>();
      tableData.forEach(item => {
        const total = months.reduce((sum, month) => sum + (item[month] || 0), 0);
        if (manufacturerTotals.has(item.manufacturer)) {
          manufacturerTotals.set(item.manufacturer, manufacturerTotals.get(item.manufacturer)! + total);
        } else {
          manufacturerTotals.set(item.manufacturer, total);
        }
      });

      // 按厂商总销量降序排序，相同厂商的品牌放在一起
      let sortedData = [...tableData].sort((a, b) => {
        // 先按厂商总销量降序排序
        const totalA = manufacturerTotals.get(a.manufacturer) || 0;
        const totalB = manufacturerTotals.get(b.manufacturer) || 0;
        
        if (totalA !== totalB) {
          return totalB - totalA; // 降序排列
        }
        
        // 厂商总销量相同时，按厂商名称排序
        return a.manufacturer.localeCompare(b.manufacturer);
      });
      
      // 如果不显示品牌，则聚合厂商数据
      if (!showBrand) {
        // 获取选中公司的名称列表
        const selectedCompanyNames = selectedCompanies.map(company => company.name);
        sortedData = aggregateByManufacturer(sortedData.filter(item => 
          selectedCompanyNames.includes(item.manufacturer)
        ));
      }
      
      setFilteredData(sortedData);
    }
  }, [sortConfig, tableData, selectedCompanies, months]);

  // 计算厂商单元格合并信息
  useEffect(() => {
    if (filteredData.length === 0) {
      setManufacturerSpans([]);
      return;
    }

    const spans: ManufacturerSpan[] = [];
    let currentManufacturer = filteredData[0].manufacturer;
    let currentSpan = 1;

    // 如果不显示品牌，每个厂商只有一行数据，不需要合并
    if (!showBrand) {
      setManufacturerSpans([]);
      return;
    }

    for (let i = 1; i < filteredData.length; i++) {
      if (filteredData[i].manufacturer === currentManufacturer) {
        currentSpan++;
      } else {
        spans.push({
          manufacturer: currentManufacturer,
          startIndex: i - currentSpan,
          span: currentSpan
        });
        currentManufacturer = filteredData[i].manufacturer;
        currentSpan = 1;
      }
    }

    // 添加最后一个厂商的合并信息
    spans.push({
      manufacturer: currentManufacturer,
      startIndex: filteredData.length - currentSpan,
      span: currentSpan
    });

    setManufacturerSpans(spans);
  }, [filteredData, showBrand]);

  // 计算环比和同比数据
  const calculateGrowthRates = (data: any[], sortedMonths: string[]) => {
    // 按厂商和品牌分组数据
    const dataByManufacturerBrand = new Map<string, any>();
    
    data.forEach(item => {
      const key = `${item.manufacturer}_${item.brand}`;
      dataByManufacturerBrand.set(key, item);
    });
    
    // 为每个厂商品牌计算环比和同比
    data.forEach(item => {
      // 遍历每个月份
      sortedMonths.forEach((month, index) => {
        // 提取月份数字和年份
        const [year, monthName] = month.split('-');
        const currentYear = parseInt(year);
        const currentMonth = parseInt(monthName.replace('月', ''));
        
        // 计算环比 (2025年1月不需要环比)
        if (!(currentYear === 2025 && currentMonth === 1) && index > 0) {
          const prevMonth = sortedMonths[index - 1];
          const prevMonthSales = item[prevMonth] || 0;
          const currentMonthSales = item[month] || 0;
          
          if (prevMonthSales > 0) {
            const momGrowth = ((currentMonthSales - prevMonthSales) / prevMonthSales) * 100;
            item[`${month}-mom`] = parseFloat(momGrowth.toFixed(2));
          } else {
            item[`${month}-mom`] = '-';
          }
        } else {
          item[`${month}-mom`] = '-';
        }
        
        // 计算同比 (2025年数据不需要同比)
        if (currentYear !== 2025) {
          // 查找去年同月数据
          const lastYearData = monthlySalesData2024.filter(
            monthlyItem => monthlyItem.company === item.manufacturer && 
                          parseInt(monthlyItem.month) === currentMonth
          );
          
          if (lastYearData.length > 0 && lastYearData[0].sales > 0) {
            const currentMonthSales = item[month] || 0;
            const lastYearSales = lastYearData.reduce((sum: number, monthlyItem: any) => sum + monthlyItem.sales, 0);
            
            const yoyGrowth = ((currentMonthSales - lastYearSales) / lastYearSales) * 100;
            item[`${month}-yoy`] = parseFloat(yoyGrowth.toFixed(2));
          } else {
            item[`${month}-yoy`] = '-';
          }
        } else {
          item[`${month}-yoy`] = '-';
        }
      });
    });
    
    return data;
  };

  // 处理排序
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // 处理数据类型选择变化
  const handleDataTypeChange = (type: DataType) => {
    setSelectedDataTypes(prev => {
      if (prev.includes(type)) {
        // 确保至少保留一个选中项
        if (prev.length > 1) {
          return prev.filter(t => t !== type);
        }
        return prev;
      } else {
        return [...prev, type];
      }
    });
  };

  // 按厂商聚合数据
  const aggregateByManufacturer = (data: any[]): any[] => {
    const manufacturerMap = new Map<string, any>();
    
    // 遍历数据，按厂商分组并聚合销量
    data.forEach(item => {
      const { manufacturer } = item;
      
      if (!manufacturerMap.has(manufacturer)) {
        // 为每个厂商创建一个新的聚合记录
        const aggregatedItem: any = {
          manufacturer: manufacturer,
          brand: '总计', // 不显示品牌时，品牌列显示"总计"
          total: 0
        };
        
         // 初始化所有月份的数据
         months.forEach(month => {
           aggregatedItem[month] = 0;
           aggregatedItem[`${month}-mom`] = 0; // 初始化为0，后续会计算
           aggregatedItem[`${month}-yoy`] = 0; // 初始化为0，后续会计算
         });
        
        manufacturerMap.set(manufacturer, aggregatedItem);
      }
      
      // 聚合销量数据
      const aggregatedItem = manufacturerMap.get(manufacturer);
      
         // 累加每个月的销量
         months.forEach(month => {
           aggregatedItem[month] += item[month] || 0;
           
           // 累加环比和同比数据（通过加权平均计算）
           const itemSales = item[month] || 0;
           const aggregatedSales = aggregatedItem[month]; // 当前累加后的销量
           
           // 只有在有销量的情况下才计算加权平均
           if (aggregatedSales > 0) {
             // 环比数据加权平均
             if (item[`${month}-mom`] !== '-' && typeof item[`${month}-mom`] === 'number') {
               const currentMom = aggregatedItem[`${month}-mom`] || 0;
               // 加权平均：(当前总和 + 新项目值 * 权重) / (总权重)
               const weight = itemSales / aggregatedSales;
               aggregatedItem[`${month}-mom`] = parseFloat(((1 - weight) * currentMom + weight * item[`${month}-mom`]).toFixed(2));
             }
             
             // 同比数据加权平均
             if (item[`${month}-yoy`] !== '-' && typeof item[`${month}-yoy`] === 'number') {
               const currentYoy = aggregatedItem[`${month}-yoy`] || 0;
               // 加权平均：(当前总和 + 新项目值 * 权重) / (总权重)
               const weight = itemSales / aggregatedSales;
               aggregatedItem[`${month}-yoy`] = parseFloat(((1 - weight) * currentYoy + weight * item[`${month}-yoy`]).toFixed(2));
             }
           }
         });
      
      // 累加总销量
      aggregatedItem.total += item.total || 0;
    });
    
    // 转换为数组并按总销量降序排序
    return Array.from(manufacturerMap.values()).sort((a, b) => b.total - a.total);
  };

  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null || num === 0) return '-';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 根据百分比值获取颜色类
  const getPercentageColorClass = (value: number | string): string => {
    if (value === '-') return 'text-gray-500';
    
    const numValue = typeof value === 'number' ? value : parseFloat(value as string);
    
    if (numValue > 0) {
      // 正值：红色系，值越大颜色越深
      if (numValue > 20) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      if (numValue > 10) return 'bg-red-50 text-red-700 dark:bg-red-800/20 dark:text-red-200';
      if (numValue > 5) return 'bg-orange-50 text-orange-600 dark:bg-orange-800/20 dark:text-orange-200';
      return 'bg-yellow-50 text-yellow-600 dark:bg-yellow-800/20 dark:text-yellow-200';
    } else if (numValue < 0) {
      // 负值：绿色系，值越小颜色越深
      const absValue = Math.abs(numValue);
      if (absValue > 20) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      if (absValue > 10) return 'bg-green-50 text-green-700 dark:bg-green-800/20 dark:text-green-200';
      if (absValue > 5) return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-800/20 dark:text-emerald-200';
      return 'bg-teal-50 text-teal-600 dark:bg-teal-800/20 dark:text-teal-200';
    } else {
      // 零值：中性色
      return 'bg-gray-50 text-gray-600 dark:bg-gray-700/30 dark:text-gray-300';
    }
  };

  // 格式化百分比
  const formatPercentage = (value: number | string): string => {
    if (value === '-') return '-';
    
    const numValue = typeof value === 'number' ? value : parseFloat(value as string);
    return `${numValue > 0 ? '+' : ''}${numValue.toFixed(1)}%`;
  };

  // 表格动画配置
  const tableVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.8 } },
  };

  return (
    <motion.div
      variants={tableVariants}
      initial="hidden"
      animate="visible"
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 ${className}`}
    >
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
         <div>
           <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">厂商品牌销量明细</h3>
           <p className="text-sm text-gray-500 dark:text-gray-400">
             各厂商各品牌月度销量明细及环比、同比增长情况
           </p>
         </div>
          <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0">
            <div className="bg-gray-50 dark:bg-gray-750 p-2 rounded-lg">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">显示数据：</label>
              <div className="flex space-x-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDataTypes.includes('sales')}
                    onChange={() => handleDataTypeChange('sales')}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    disabled={selectedDataTypes.length <= 1 && selectedDataTypes.includes('sales')}
                  />
                  <span className="ml-1 text-xs text-gray-700 dark:text-gray-300">销量</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDataTypes.includes('mom')}
                    onChange={() => handleDataTypeChange('mom')}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    disabled={selectedDataTypes.length <= 1 && selectedDataTypes.includes('mom')}
                  />
                  <span className="ml-1 text-xs text-gray-700 dark:text-gray-300">环比</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDataTypes.includes('yoy')}
                    onChange={() => handleDataTypeChange('yoy')}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    disabled={selectedDataTypes.length <= 1 && selectedDataTypes.includes('yoy')}
                  />
                  <span className="ml-1 text-xs text-gray-700 dark:text-gray-300">同比</span>
                </label>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-750 p-2 rounded-lg">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={showBrand}
                  onChange={() => setShowBrand(!showBrand)}
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="ml-1 text-xs text-gray-700 dark:text-gray-300">显示品牌</span>
              </label>
            </div>
            
            <CarCompanySelector 
              onCompanyChange={setSelectedCompanies} 
              initialSelectedCompanies={selectedCompanies}
            />
         </div>
       </div>

          <div className="overflow-x-auto max-h-[900px] border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              {/* 表格头部 - 冻结表头 */}
               <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
               <tr>
                  <th 
                    rowSpan={2}
                    className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 sticky left-0 z-20 bg-gray-100 dark:bg-gray-800"
                    style={{ minWidth: '80px' }}
                    onClick={() => handleSort('manufacturer')}
                  >
                   <div className="flex items-center justify-center">
                     厂商名称
                     {sortConfig?.key === 'manufacturer' && (
                       <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                     )}
                   </div>
                 </th>
                 {showBrand && (
                   <th 
                     rowSpan={2}
                     className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 sticky left-[80px] z-20 bg-gray-100 dark:bg-gray-800"
                     onClick={() => handleSort('brand')}
                     style={{ minWidth: '80px' }}
                   >
                     <div className="flex items-center justify-center">
                       品牌名称
                       {sortConfig?.key === 'brand' && (
                         <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                       )}
                     </div>
                   </th>
                 )}
                {/* 月份表头 */}
                {months.map((month) => (
                  <th 
                    key={month} 
                    colSpan={selectedDataTypes.length}
                    className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={() => handleSort(month)}
                    style={{ minWidth: selectedDataTypes.length * 40 }}
                  >
                    <div className="flex items-center justify-center">
                      {formattedMonths[month]}
                      {sortConfig?.key === month && (
                        <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                      )}
                    </div>
                  </th>
                ))}
                <th 
                  rowSpan={2}
                  className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => handleSort('total')}
                  style={{ minWidth: '80px' }}
                >
                  <div className="flex items-center justify-center">
                    总计
                    {sortConfig?.key === 'total' && (
                      <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                    )}
                  </div>
                </th>
              </tr>
               {/* 第二层表头 - 根据选择显示销量、环比、同比，只在月份列下显示 */}
               <tr className="bg-gray-100 dark:bg-gray-800">
                 {months.map((month) => (
                   <>
                     {selectedDataTypes.includes('sales') && (
                       <th 
                         key={`${month}-sales`} 
                         className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                         onClick={() => handleSort(month)}
                         style={{ minWidth: '40px' }}
                       >
                         <div className="flex items-center justify-center">
                           <span className="text-xs">销量</span>
                           {sortConfig?.key === month && (
                             <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                           )}
                         </div>
                       </th>
                     )}
                     
                      {/* 环比和同比表头 */}
                      {selectedDataTypes.includes('mom') && (
                        <th 
                          key={`${month}-mom`} 
                          className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                          onClick={() => handleSort(`${month}-mom`)}
                          style={{ minWidth: '40px' }}
                        >
                          <div className="flex items-center justify-center">
                            <span className="text-xs">环比</span>
                            {sortConfig?.key === `${month}-mom` && (
                              <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                            )}
                          </div>
                        </th>
                      )}
                      
                      {selectedDataTypes.includes('yoy') && (
                        <th 
                          key={`${month}-yoy`} 
                          className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                          onClick={() => handleSort(`${month}-yoy`)}
                          style={{ minWidth: '40px' }}
                        >
                          <div className="flex items-center justify-center">
                            <span className="text-xs">同比</span>
                            {sortConfig?.key === `${month}-yoy` && (
                              <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                            )}
                          </div>
                        </th>
                      )}
                   </>
                 ))}
               </tr>
           </thead>
          
          {/* 表格主体 */}
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredData.length > 0 ? (
              filteredData.map((row, index) => {
                // 查找当前行是否需要显示厂商名称
                const currentSpan = manufacturerSpans.find(span => span.startIndex === index);
                
                return (
                  <tr 
                    key={`${row.brand}-${row.manufacturer}-${index}`} 
                    className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}
                  >
                     {/* 厂商名称单元格 - 根据是否显示品牌决定是否合并，并添加粘性定位 */}
                     {/* 不显示品牌时，每个厂商只有一行数据，不需要合并 */}
                     {showBrand ? (
                       currentSpan ? (
                        <td 
                          className="px-1 py-1.5 text-sm text-gray-700 dark:text-gray-300 text-center sticky left-0 z-10 bg-white dark:bg-gray-800" 
                          style={{ verticalAlign: 'middle', minWidth: '80px' }}
                          rowSpan={currentSpan.span}
                        >
                          {currentSpan.manufacturer}
                        </td>
                       ) : null
                     ) : (
                       <td 
                         className="px-1 py-1.5 text-sm text-gray-700 dark:text-gray-300 text-center sticky left-0 z-10 bg-white dark:bg-gray-800" 
                         style={{ verticalAlign: 'middle', minWidth: '80px' }}
                       >
                         {row.manufacturer}
                       </td>
                     )}
                     
                     {/* 品牌名称单元格 - 根据是否显示品牌决定是否显示 */}
                     {showBrand && (
                      <td className="px-1 py-1.5 text-sm font-medium text-gray-900 dark:text-white text-center sticky left-[80px] z-10 bg-white dark:bg-gray-800" style={{ verticalAlign: 'middle', minWidth: '80px' }}>
                        {row.brand}
                      </td>
                     )}
                    
                    {/* 月份数据单元格 */}
                    {months.map((month) => (
                      <>
                        {selectedDataTypes.includes('sales') && (
                          <td 
                            key={`${month}-sales`} 
                            className="px-1 py-1.5 text-sm text-center text-gray-700 dark:text-gray-300"
                            style={{ verticalAlign: 'middle', minWidth: '40px' }}
                          >
                            {formatNumber(typeof row[month] === 'number' ? row[month] : parseInt(row[month] as string) || 0)}
                          </td>
                        )}
                        
                          {/* 环比和同比数据 */}
                          {selectedDataTypes.includes('mom') && (
                            <td 
                              key={`${month}-mom`} 
                              className={`px-1 py-1.5 text-center ${getPercentageColorClass(row[`${month}-mom`])}`}
                              style={{ verticalAlign: 'middle', minWidth: '40px' }}
                            >
                              {formatPercentage(row[`${month}-mom`])}
                            </td>
                          )}
                          
                          {selectedDataTypes.includes('yoy') && (
                            <td 
                              key={`${month}-yoy`} 
                              className={`px-1 py-1.5 text-center ${getPercentageColorClass(row[`${month}-yoy`])}`}
                              style={{ verticalAlign: 'middle', minWidth: '40px' }}
                            >
                              {formatPercentage(row[`${month}-yoy`])}
                            </td>
                          )}
                      </>
                    ))}
                    
                    {/* 总计单元格 */}
                    <td 
                      className="px-1 py-1.5 text-sm font-bold text-center text-gray-900 dark:text-white"
                      style={{ verticalAlign: 'middle', minWidth: '35px' }}
                    >
                      {formatNumber(typeof row.total === 'number' ? row.total : parseInt(row.total as string) || 0)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={months.length * selectedDataTypes.length + 3} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
       {/* 说明信息 */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
         <p>注：{showBrand? '销量数据按照厂商-品牌维度聚合，相同厂商的单元格已合并显示。2025年1月不显示环比数据，2025年全年不显示同比数据，使用"-"代替。' 
           : '销量数据按照厂商维度聚合，显示各厂商的月度总销量、累计销量以及加权平均计算的环比和同比增长数据。'}
        </p>
      </div>
    </motion.div>
  );
};

export default SalesTable;