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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [vehicleTypeData, setVehicleTypeData] = useState<any[]>([]);
  const [salesTypeData, setSalesTypeData] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const carModelData = getCurrentCarModelData(dateRange);
        let companyModels = carModelData.filter(item => 
          item.manufacturer === selectedCompany.name
        );
        
        // 示例数据补充（模拟同一车型多能源类型：问界M7纯电/增程）
        if (companyModels.length === 0 || companyModels.every(model => model.sales === 0)) {
          if (selectedCompany.name === '华为') { // 新增华为/问界示例
            companyModels = [
              {
                manufacturer: '华为',
                brand: '问界',
                modelName: 'M7',
                vehicleType: 'SUV',
                energyType: '纯电', // 版本1：纯电
                sales: 6000,
                minPrice: 28.99,
                maxPrice: 32.99,
                month: '1月',
                year: 2025
              },
              {
                manufacturer: '华为',
                brand: '问界',
                modelName: 'M7',
                vehicleType: 'SUV',
                energyType: '增程', // 版本2：增程
                sales: 8000,
                minPrice: 25.99,
                maxPrice: 29.99,
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
                modelName: '主力车型A', // 同一车型不同能源
                vehicleType: 'SUV',
                energyType: '插混',
                sales: 3000,
                minPrice: 18,
                maxPrice: 28,
                month: '1月',
                year: 2025
              }
            ];
          }
        }
        
        const energyTypeCount: Record<string, number> = {};
        const energyTypeSales: Record<string, number> = {};
        // 🔴 修改1：唯一key包含能源类型（厂商-品牌-车型名-能源类型）
        const uniqueModelEnergyCombos = new Set<string>(); 
        
        // 初始化所有能源类型为0
        energyTypes.forEach(type => {
          energyTypeCount[type.name] = 0;
          energyTypeSales[type.name] = 0;
        });
        
        companyModels.forEach(model => {
          // 🔴 修改2：生成「车型+能源类型」的复合唯一key
          const modelEnergyKey = `${model.manufacturer}-${model.brand}-${model.modelName}-${model.energyType}`;
          
          // 车型数量统计：按「车型+能源类型」去重
          if (!uniqueModelEnergyCombos.has(modelEnergyKey)) {
            uniqueModelEnergyCombos.add(modelEnergyKey);
            energyTypeCount[model.energyType] = (energyTypeCount[model.energyType] || 0) + 1;
          }
          
          // 销量统计：按「车型+能源类型」累加
          energyTypeSales[model.energyType] = (energyTypeSales[model.energyType] || 0) + model.sales;
        });
        
        // 转换为图表数据格式（逻辑不变）
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

  // 格式化数字（逻辑不变）
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 自定义Tooltip（逻辑不变）
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

  // 图表动画配置（逻辑不变）
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
          分析{selectedCompany.name}的能源类型分布情况（含同一车型多能源版本）
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 车辆能源类型分布（按车型+能源版本数量） */}
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
                    height="36"
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
            按「车型+能源版本」数量统计（同一车型多能源版本分别计数）
          </p>
        </div>

        {/* 能源类型销量占比（按能源版本销量） */}
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
                    height="36"
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
            按「车型+能源版本」销量统计（同一车型多能源版本销量分别累加）
          </p>
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
        <p>
          <i className="fa-solid fa-circle-info mr-1"></i>
          图表展示{selectedCompany.name}的能源类型分布情况（含同一车型多能源版本），包括「车型+能源版本」数量分布和销量分布。数据基于选定的时间范围。
        </p>
      </div>
    </motion.div>
  );
};

export default EnergyTypeDistributionChart;