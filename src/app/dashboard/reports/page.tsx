// ================================================================
// src/app/dashboard/reports/page.tsx
// Página principal de reportes y análisis - CORREGIDA
// ================================================================

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useAuth } from '@/components/providers/AuthProvider';
import { useChildren } from '@/hooks/use-children';
import { useLogs } from '@/hooks/use-logs';
import { ProgressChart } from '@/components/reports/ProgressChart';
import { CategoryDistribution } from '@/components/reports/CategoryDistribution';
import { MoodTrendChart } from '@/components/reports/MoodTrendChart';
import { ExportReportDialog } from '@/components/reports/ExportReportDialog';
// ✅ ARREGLO: Importar todos los componentes desde TimePatterns.tsx
import { TimePatterns, CorrelationAnalysis, AdvancedInsights } from '@/components/reports/TimePatterns';
import type { DateRange } from 'react-day-picker';
import { 
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
  FileText,
  PieChart,
  LineChart,
  Users,
  Activity,
  Heart,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

// ================================================================
// FUNCIÓN HELPER PARA CALCULAR TENDENCIA DE MEJORA
// ================================================================
function calculateImprovementTrend(logs: any[]): number {
  if (logs.length < 2) return 0;
  
  const moodLogs = logs.filter(log => log.mood_score).sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  if (moodLogs.length < 2) return 0;
  
  const midpoint = Math.floor(moodLogs.length / 2);
  const firstHalf = moodLogs.slice(0, midpoint);
  const secondHalf = moodLogs.slice(midpoint);
  
  const firstAvg = firstHalf.reduce((sum, log) => sum + log.mood_score, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, log) => sum + log.mood_score, 0) / secondHalf.length;
  
  return secondAvg - firstAvg;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { children, loading: childrenLoading } = useChildren();
  const { logs, stats, loading: logsLoading } = useLogs();
  
  const [selectedChild, setSelectedChild] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 3),
    to: new Date()
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Filtrar logs según selecciones
  const filteredLogs = logs.filter(log => {
    if (selectedChild !== 'all' && log.child_id !== selectedChild) {
      return false;
    }
    
    if (dateRange?.from && new Date(log.created_at) < dateRange.from) {
      return false;
    }
    
    if (dateRange?.to && new Date(log.created_at) > dateRange.to) {
      return false;
    }
    
    return true;
  });

  // Calcular métricas
  const metrics = {
    totalLogs: filteredLogs.length,
    averageMood: filteredLogs.filter(l => l.mood_score).length > 0 
      ? (filteredLogs.filter(l => l.mood_score).reduce((sum, l) => sum + l.mood_score, 0) / filteredLogs.filter(l => l.mood_score).length)
      : 0,
    improvementTrend: calculateImprovementTrend(filteredLogs),
    activeCategories: new Set(filteredLogs.map(l => l.category_name).filter(Boolean)).size,
    followUpsRequired: filteredLogs.filter(l => l.follow_up_required).length,
    activeDays: new Set(filteredLogs.map(l => new Date(l.created_at).toDateString())).size
  };

  if (childrenLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes y Análisis</h1>
          <p className="mt-2 text-gray-600">
            Análisis detallado del progreso y patrones de comportamiento
          </p>
        </div>
        <Button onClick={() => setIsExportDialogOpen(true)}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Reporte
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">periodo</label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>
            <div> className="filex items-end">
              <button
                variant="outline"
                onClick={() => {
                  setSelectedChild('all');
                  setDateRange({
                    from: subMonths(new Date(), 3),
                    to: new Date()
                  });
                }
              ></button>
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Total Registros"
          value={metrics.totalLogs}
          icon={FileText}
          color="blue"
          subtitle="En el período seleccionado"
        />
        
        <MetricCard
          title="Estado de Ánimo"
          value={metrics.averageMood.toFixed(1)}
          suffix="/5"
          icon={Heart}
          color={metrics.averageMood >= 4 ? 'green' : metrics.averageMood >= 3 ? 'orange' : 'red'}
          subtitle="Promedio del período"
        />
        
        <MetricCard
          title="Tendencia"
          value={metrics.improvementTrend > 0 ? '+' : ''}
          icon={metrics.improvementTrend > 0 ? TrendingUp : metrics.improvementTrend < 0 ? TrendingUp : Target}
          color={metrics.improvementTrend > 0 ? 'green' : metrics.improvementTrend < 0 ? 'red' : 'gray'}
          subtitle={metrics.improvementTrend > 0 ? 'Mejorando' : metrics.improvementTrend < 0 ? 'Necesita atención' : 'Estable'}
        />
        
        <MetricCard
          title="Categorías"
          value={metrics.activeCategories}
          icon={PieChart}
          color="purple"
          subtitle="Diferentes áreas"
        />
        
        <MetricCard
          title="Seguimientos"
          value={metrics.followUpsRequired}
          icon={AlertTriangle}
          color={metrics.followUpsRequired > 0 ? 'orange' : 'green'}
          subtitle="Pendientes"
        />
        
        <MetricCard
          title="Días Activos"
          value={metrics.activeDays}
          icon={Calendar}
          color="blue"
          subtitle="Con registros"
        />
      </div>

      {/* Tabs de análisis */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="patterns">Patrones</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Progreso General</CardTitle>
                <CardDescription>
                  Evolución del estado de ánimo en el tiempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProgressChart data={filteredLogs} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución por Categorías</CardTitle>
                <CardDescription>
                  Frecuencia de registros por área
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryDistribution data={filteredLogs} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Tendencias */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tendencias del Estado de Ánimo</CardTitle>
              <CardDescription>
                Análisis temporal del bienestar emocional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MoodTrendChart data={filteredLogs} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Patrones */}
        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Patrones Temporales</CardTitle>
                <CardDescription>
                  Identificación de comportamientos recurrentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimePatterns logs={filteredLogs} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Correlaciones</CardTitle>
                <CardDescription>
                  Relaciones entre diferentes variables
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CorrelationAnalysis logs={filteredLogs} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Insights */}
        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análisis Avanzado</CardTitle>
              <CardDescription>
                Insights generados por inteligencia artificial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdvancedInsights logs={filteredLogs} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <ExportReportDialog 
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        data={filteredLogs}
        metrics={metrics}
      />
    </div>
  );
}

// ================================================================
// COMPONENTES AUXILIARES
// ================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'red' | 'purple' | 'green' | 'orange' | 'gray';
  subtitle: string;
  suffix?: string;
}

function MetricCard({ title, value, icon: Icon, color, subtitle, suffix }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    gray: 'bg-gray-100 text-gray-600'
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-center space-x-1">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {suffix && <span className="text-lg text-gray-500">{suffix}</span>}
            </div>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}