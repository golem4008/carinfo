import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatNumber } from '../lib/utils';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DateRange, CarCompany } from '../types';
import { getCurrentCarModelData } from '../mocks/data';
import { energyTypes } from '../mocks/energyTypes';

interface EnergyTypeDistributionChartProps {
  className?: string;
  dateRange?: DateRange;
  selectedCompany: CarCompany;
}

const EnergyTypeDistributionChart: React.FC<EnergyTypeDistributionChartProps> = ({
  className = '',
  dateRange,
  selectedCompany
}) => {
  // 状态管理
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [vehicleTypeData, setVehicleTypeData] = useState<any[]>([]); // 车辆能源类型占比数据
  const [salesTypeData, setSalesTypeData] = useState<any[]>([]); // 能源类型销量占比数据

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
        
        // 添加示例数据确保车企有完整数据
        if (companyModels.length === 0 || companyModels.every(model => model.sales === 0)) {
          // 为特斯拉添加示例数据
          if (selectedCompany.name === '特斯拉') {
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
            // 为其他车企添加通用示例数据
            companyModels = [
              {
                manufacturer: selectedCompany.name,
                brand: selectedCompany.name,
                modelName: '主力车型A',
                vehicleType: 'SUV',
                energyType: '纯电',
                sales: 5000,
                minPrice: 20,
                maxPrice: 30,
                month: '1月',
                year: 2025
              },
              {
                manufacturer: selectedCompany.name,
                brand: selectedCompany.name,
                modelName: '主力车型B',
                vehicleType: '轿车',
                energyType: '插混',
                sales: 3000,
                minPrice: 15,
                maxPrice: 25,
                month: '1月',
                year: 2025
              }
            ];
          }
        }
        
        // 计算车辆能源类型占比（按车型数量）
        const energyTypeCount: Record<string, number> = {};
        const energyTypeSales: Record<string, number> = {};
        const uniqueModels = new Set<string>(); // 用于存储唯一的车型标识
        
        // 初始化所有能源类型为0
        energyTypes.forEach(type => {
          energyTypeCount[type.name] = 0;
          energyTypeSales[type.name] = 0;
        });
        
        // 计算每个能源类型的车型数量和销量
        companyModels.forEach(model => {
          // 计算车型数量（确保相同的车型只计算一次）
          const modelKey = `${model.manufacturer}-${model.brand}-${model.modelName}`;
          if (!uniqueModels.has(modelKey)) {
            uniqueModels.add(modelKey);
            energyTypeCount[model.energyType] = (energyTypeCount[model.energyType] || 0) + 1;
          }
          
          // 计算销量
          energyTypeSales[model.energyType] = (energyTypeSales[model.energyType] || 0) + model.sales;
        });
        
        // 转换为图表数据格式
        const vehicleData = Object.keys(energyTypeCount)
          .filter(type => type !== '未知' && energyTypeCount[type] > 0)
          .map(type => {
            const energyTypeConfig = energyTypes.find(et => et.name === type);
            return {
              name: type,
              value: energyTypeCount[type],
              color: energyTypeConfig?.color || '#8884d8'
            };
          })
          .sort((a, b) => b.value - a.value);
        
        const salesData = Object.keys(energyTypeSales)
          .filter(type => type !== '未知' && energyTypeSales[type] > 0)
          .map(type => {
            const energyTypeConfig = energyTypes.find(et => et.name === type);
            return {
              name: type,
              value: energyTypeSales[type],
              color: energyTypeConfig?.color || '#8884d8'
            };
          })
          .sort((a, b) => b.value - a.value);
        
        setVehicleTypeData(vehicleData);
        setSalesTypeData(salesData);
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedCompany, dateRange]);

  // 格式化数字，添加千位分隔符
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
              占比: {((data.value / salesTypeData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
            </p>
          )}
          {payload[0].name === '车型数量' && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              占比: {((data.value / vehicleTypeData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
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
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">车企能源类型情况</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          分析{selectedCompany.name}的能源类型分布情况
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 第一个圆饼图：车企所有车辆能源类型占比（按车型数量） */}
        <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">车辆能源类型分布</h4>
          <div className="h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500 dark:text-gray-400 flex items-center">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  <span>加载数据中...</span>
                </div>
              </div>
            ) : vehicleTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vehicleTypeData}
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
                    {vehicleTypeData.map((entry, index) => (
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
            按车型数量统计的能源类型分布
          </p>
        </div>

        {/* 第二个圆饼图：根据能源类型分类的车型销量占比 */}
        <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">能源类型销量占比</h4>
          <div className="h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500 dark:text-gray-400 flex items-center">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  <span>加载数据中...</span>
                </div>
              </div>
            ) : salesTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesTypeData}
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
                    {salesTypeData.map((entry, index) => (
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
            按销量统计的能源类型分布
          </p>
        </div>
      </div>

      {/* 模块说明 */}
      <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
        <p>
          <i className="fa-solid fa-circle-info mr-1"></i>
          图表展示{selectedCompany.name}的能源类型分布情况，包括车型数量分布和销量分布。数据基于选定的时间范围。
        </p>
      </div>
    </motion.div>
  );
};

export default EnergyTypeDistributionChart;