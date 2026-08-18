import { BarChart } from '@mui/x-charts/BarChart';

export default function Adminbarchart({ bugs = [] }) {
  const getCount = (sev) => bugs.filter(b => (b.severity || "").toLowerCase() === sev.toLowerCase()).length;
  
  const critical = getCount("Critical");
  const high = getCount("High");
  const medium = getCount("Medium") || getCount("Moderate");
  const low = getCount("Low") || getCount("Minor");

  return (
    <div className="w-full bg-card p-2">
      <p className='font-semibold text-sm'>Bug Level Overview</p>
      <BarChart
        xAxis={[
          { 
            scaleType: 'band', 
            data: ['Critical', 'High', 'Medium', 'Low'],
            categoryGapRatio: 0.4,
            colorMap: {
              type: 'ordinal',
              values: ['Critical', 'High', 'Medium', 'Low'],
              colors: ['#ef4444', '#f97316', '#eab308', '#3b82f6'],
            }
          }
        ]}
        series={[
          { 
            data: [critical, high, medium, low],
          }
        ]}
        height={165}
        margin={{ top: 10, bottom: 25, left: 30, right: 10 }}
        slotProps={{
          legend: { hidden: true }
        }}
      />
    </div>
  );
}
