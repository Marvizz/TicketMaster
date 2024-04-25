import React, { useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthProvider';
import API_BASE_URL from '../Config';
import Chart from 'chart.js/auto';

const UserSalesChart = () => {
  const chartRef = useRef(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/SalesData`, null, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        });

        if (response.status === 200) {
          const data = response.data;
          const labels = data.map(item => item.date);
          const datasets = [];
          const uniqueUsers = new Set(data.flatMap(item => Object.keys(item.user_counts)));
          uniqueUsers.forEach(user => {
            const userData = data.flatMap(item => {
              const count = item.user_counts[user] || 0;
              return { date: item.date, count };
            });
            const { bg, border } = losowyKolor();
            const dataset = {
              label: user || 'Nieznany użytkownik',
              data: userData.map(({ date, count }) => ({
                x: date,
                y: count,
              })),
              backgroundColor: bg,
              borderColor: border,
              borderWidth: 1,
            };

            datasets.push(dataset);
          });

          const chartData = {
            labels,
            datasets,
          };

          if (chartRef.current) {
            const chart = chartRef.current;
            chart.data = chartData;
            chart.update();
          } else {
            const canvas = document.getElementById('sales-chart');
            const chart = new Chart(canvas, {
              type: 'bar',
              data: chartData,
              options: {
                responsive: true,
                scales: {
                  x: {
                    stacked: true,
                  },
                  y: {
                    stacked: true,
                  },
                },
              },
            });
            chartRef.current = chart;
          }
        } else {
          console.error('Błąd podczas pobierania danych sprzedaży');
        }
      } catch (error) {
        console.error('Błąd podczas pobierania danych sprzedaży:', error);
      }
    };

    fetchSalesData();
  }, [token]);

  return (
    <div>
      <h2>Wykres sprzedaży biletów przez użytkowników</h2>
      <canvas id="sales-chart" />
    </div>
  );
};

function losowyKolor() {
  const red = Math.floor(Math.random() * 256);
  const green = Math.floor(Math.random() * 256);
  const blue = Math.floor(Math.random() * 256);
  const alpha = 0.4;
  const backgroundColor = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  const borderColor = `rgb(${red * 0.2}, ${green * 0.2}, ${blue * 0.2})`;
  return { bg: backgroundColor, border: borderColor };
}

export default UserSalesChart;