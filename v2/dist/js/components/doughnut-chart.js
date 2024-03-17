define(["VueChartJs"], function (charts) {
    var DoughnutChart = Vue.extend({
        extends: charts.Doughnut,
        props: {
            data: Object
        },
        data: function () {
            return {
                views: [],
                plain: false,
                legendBoxWidth: 0
            }
        },
        mounted: function () {
            // var labels= ['שולמו', 'לא שולמו'];
            // var datasets= [
            //     {
            //         label: 'GitHub Commits',
            //         backgroundColor: ["#0074D9", "#FF4136", "#2ECC40", "#FF851B", "#7FDBFF", "#B10DC9", "#FFDC00", "#001f3f", "#39CCCC", "#01FF70", "#85144b", "#F012BE", "#3D9970", "#111111", "#AAAAAA"],
            //         data: [40, 20, 12, 39, 10, 40, 39, 80, 40, 20, 12, 11]
            //     }
            // ];
            // var params = {
            //     labels: labels,
            //     datasets: datasets,
            // };
            // this.renderChart(params);


        },
        methods: {
        },
        watch: {
            data: function() {
                var comp = this;
                var overrideLegendBoxWidth = comp.data.legendBoxWidth || 0;
                var params = {
                    labels: comp.data.labels,
                    datasets: comp.data.datasets
                };

                var chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    legend: {
                        display: true,
                    },
                    dataLabels: {
                        enabled: false
                    },
                };
                if (overrideLegendBoxWidth) {
                    if (!chartOptions.legend.labels)
                        chartOptions.legend.labels = {};
                    chartOptions.legend.labels.boxWidth = overrideLegendBoxWidth;
                }
                comp.renderChart(params, chartOptions);
                comp.$refs.canvas.style.width = '100%';
            }
        }
    });

    Vue.component('doughnut-chart', DoughnutChart);
});