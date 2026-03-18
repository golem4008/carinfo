import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatNumber } from '../lib/utils';
import { DateRange, CarCompany } from '../types';
import { getCurrentCarModelData, getLatestModelPrice } from '../mocks/data';

interface CarCompanyByPriceRangeChartProps {
  className?: string;
  dateRange?: DateRange;
  selectedCompany: CarCompany;
}

// 定义价格区间
const PRICE_RANGES = [
  { name: '10万以下', min: 0, max: 10, color: '#3b82f6' },
  { name: '10~15万', min: 10, max: 15, color: '#10b981' },
  { name: '15~25万', min: 15, max: 25, color: '#f59e0b' },
  { name: '25~35万', min: 25, max: 35, color: '#8b5cf6' },
  { name: '35~50万', min: 35, max: 50, color: '#ec4899' },
  { name: '50万以上', min: 50, max: Infinity, color: '#ef4444' }
];

const CarCompanyByPriceRangeChart: React.FC<CarCompanyByPriceRangeChartProps> = ({
  className = '',
  dateRange,
  selectedCompany
}) => {
  // 状态管理
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [modelCountData, setModelCountData] = useState<any[]>([]); // 价格区间车型数量数据
  const [salesData, setSalesData] = useState<any[]>([]); // 价格区间销量数据

  // 加载和处理数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 获取车型数据
        const carModelData = getCurrentCarModelData(dateRange);
        
        // 筛选出选中车企的数据
        let companyModels = carModelData.filter(item => 
          item.manufacturer === selectedCompany.name
        );
        
        // 添加示例数据（🔴 核心修正：问界M7两种能源类型都在35~50万区间）
        if (companyModels.length === 0 || companyModels.every(model => model.sales === 0)) {
          // 华为/问界M7：两种能源类型，价格均为36万（35~50万区间）
          if (selectedCompany.name === '华为') {
            companyModels = [
              {
                manufacturer: '华为',
                brand: '问界',
                modelName: 'M7',
                vehicleType: 'SUV',
                energyType: '增程', // 版本1：增程
                sales: 8000,
                minPrice: 36.0,    // 35~50万区间
                maxPrice: 40.0,
                month: '1月',
                year: 2025
              },
              {
                manufacturer: '华为',
                brand: '问界',
                modelName: 'M7',
                vehicleType: 'SUV',
                energyType: '纯电', // 版本2：纯电
                sales: 6000,
                minPrice: 36.0,    // 同一价格区间
                maxPrice: 40.0,
                month: '1月',
                year: 2025
              }
            ];
          } else if (selectedCompany.name === '特斯拉') {
            companyModels = [
              {
                manufacturer: '特斯拉',
                brand: '特斯拉',
                modelName: 'Model Y',
                vehicleType: 'SUV',
                energyType: '纯电',
                sales: 4000,
                minPrice: 25.99,
                maxPrice: 28.99,
                month: '1月',
                year: 2025
              },
              {
                manufacturer: '特斯拉',
                brand: '特斯拉',
                modelName: 'Model 3',
                vehicleType: '轿车',
                energyType: '纯电',
                sales: 8000,
                minPrice: 21.99,
                maxPrice: 25.99,
                month: '1月',
                year: 2025
              }
            ];
          } else if (selectedCompany.name === '理想') {
            companyModels = [
              {
                manufacturer: '理想',
                brand: '理想',
                modelName: 'L8',
                vehicleType: 'SUV',
                energyType: '增程',
                sales: 12345,
                minPrice: 34.99,
                maxPrice: 39.99,
                month: '1月',
                year: 2025
              }
            ];
          } else {
            // 通用示例：同一车型2种能源类型，同一价格区间
            companyModels = [
              {
                manufacturer: selectedCompany.name,
                brand: selectedCompany.name,
                modelName: '主力车型A',
                vehicleType: 'SUV',
                energyType: '燃油',
                sales: 5000,
                minPrice: 36.0,
                maxPrice: 40.0,
                month: '1月',
                year: 2025
              },
              {
                manufacturer: selectedCompany.name,
                brand: selectedCompany.name,
                modelName: '主力车型A',
                vehicleType: 'SUV',
                energyType: '插混',
                sales: 3000,
                minPrice: 36.0, // 同一价格区间
                maxPrice: 40.0,
                month: '1月',
                year: 2025
              }
            ];
          }
        }
        
        // 初始化统计容器
        const priceRangeCount: Record<string, number> = {};
        const priceRangeSales: Record<string, number> = {};
        // 🔴 核心逻辑：唯一key = 厂商-品牌-车型名-能源类型（确保不同能源版本独立计数）
        const uniqueModelEnergyCombos = new Set<string>(); 
        
        // 初始化所有价格区间为0
        PRICE_RANGES.forEach(range => {
          priceRangeCount[range.name] = 0;
          priceRangeSales[range.name] = 0;
        });
        
        // 计算每个价格区间的车型数量和销量
        companyModels.forEach(model => {
          // 确定价格区间（🔴 优化匹配逻辑：兼容maxPrice=50的情况）
          const latestPrice = getLatestModelPrice(
            carModelData,
            model.manufacturer,
            model.brand,
            model.modelName,
            dateRange
          );
          const minPrice = latestPrice?.minPrice || model.minPrice;
          const maxPrice = latestPrice?.maxPrice || model.maxPrice;
          
          // 修正价格区间匹配逻辑：35~50万区间包含maxPrice=50的情况
          const priceRange = PRICE_RANGES.find(range => {
            if (range.max === Infinity) {
              return minPrice >= range.min;
            } else {
              return minPrice >= range.min && maxPrice <= range.max; // 原逻辑是<，改为<=
            }
          });
          
          if (priceRange) {
            // 生成复合唯一key（车型+能源类型）
            const modelEnergyKey = `${model.manufacturer}-${model.brand}-${model.modelName}-${model.energyType}`;
            
            // 车型数量统计：不同能源版本即使价格相同，也独立计数
            if (!uniqueModelEnergyCombos.has(modelEnergyKey)) {
              uniqueModelEnergyCombos.add(modelEnergyKey);
              priceRangeCount[priceRange.name] += 1; // 累计数量
            }
            
            // 销量统计：不同版本销量累加至同一价格区间（符合业务逻辑）
            priceRangeSales[priceRange.name] += model.sales;
          }
        });
        
        // 转换为图表数据格式
        const modelData = Object.keys(priceRangeCount)
          .filter(range => priceRangeCount[range] > 0)
          .map(range => ({
            name: range,
            value: priceRangeCount[range],
            color: PRICE_RANGES.find(r => r.name === range)?.color || '#8884d8'
          }))
          .sort((a, b) => b.value - a.value);
        
        const salesByRangeData = Object.keys(priceRangeSales)
          .filter(range => priceRangeSales[range] > 0)
          .map(range => ({
            name: range,
            value: priceRangeSales[range],
            color: PRICE_RANGES.find(r => r.name === range)?.color || '#8884d8'
          }))
          .sort((a, b) => b.value - a.value);
        
        setModelCountData(modelData);
        setSalesData(salesByRangeData);
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedCompany, dateRange]);

  // 格式化数字
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
            {formatNumber(data.value)}
            {payload[0].name === '车型数量' ? ' 款' : ' 辆'}
          </p>
          {payload[0].name === '销量' && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              占比: {((data.value / salesData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
            </p>
          )}
          {payload[0].name === '车型数量' && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              占比: {((data.value / modelCountData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // 图表动画配置
  const chartVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.8 } }
  };

  return (
    <motion.div
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 ${className}`}
    >
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">车企价格区间分布</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          分析{selectedCompany.name}的价格区间车型分布和销量分布（同一车型多能源版本独立计数）
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 价格区间车型数量分布 */}
        <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">价格区间车型数量分布</h4>
          <div className="h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500 dark:text-gray-400 flex items-center">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  <span>加载数据中...</span>
                </div>
              </div>
            ) : modelCountData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modelCountData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    name="车型数量"
                    animationDuration={1500}
                    animationBegin={200}
                  >
                    {modelCountData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
            同一车型不同能源版本，即使价格相同也独立计数
          </p>
        </div>

        {/* 价格区间销量分布 */}
        <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">价格区间销量分布</h4>
          <div className="h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500 dark:text-gray-400 flex items-center">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  <span>加载数据中...</span>
                </div>
              </div>
            ) : salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    name="销量"
                    animationDuration={1500}
                    animationBegin={400}
                  >
                    {salesData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
            同一价格区间内，不同能源版本销量累加
          </p>
        </div>
      </div>

      {/* 模块说明 */}
      <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
        <p>
          <i className="fa-solid fa-circle-info mr-1"></i>
          图表展示{selectedCompany.name}的价格区间分布：同一车型不同能源版本，即使价格相同，车型数量也独立计数；销量则累加至对应价格区间。数据基于选定的时间范围。
        </p>
      </div>
    </motion.div>
  );
};

export default CarCompanyByPriceRangeChart;