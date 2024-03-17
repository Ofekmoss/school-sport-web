define(["VueChartJs", "views"], function (charts, Views) {
    var BarChart = Vue.extend({
        extends: charts.Bar,
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
                var params = {
                    labels: this.data.labels,
                    datasets: this.data.datasets,
                    views: null
                };
                var plain = comp.data.plain || false;
                var overrideLegendBoxWidth = comp.data.legendBoxWidth || 0;
                var fontSize = 0;
                var barLegend = {
                    display: false
                };
                if (plain) {
                    barLegend = {
                        "position": "top",
                        "display": true,
                        "labels": {
                            "usePointStyle":false,
                            "boxWidth": 30
                        }
                    };
                } else {
                    fontSize = 20;
                    if (this.data.labels.length > 5)
                        fontSize -= Math.floor(this.data.labels.length / 5);
                    if (fontSize < 10)
                        fontSize = 10;
                }
                var chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    "stacked": true,
                    legend: barLegend,
                    dataLabels: {
                        // enabled: false
                    },
                    scales: {
                        yAxes: [
                            {
                                display: true,
                                ticks: {
                                    fontSize: fontSize
                                },
                                "stacked": plain
                            },
                        ],
                        xAxes: [
                            {
                                display: true,
                                ticks: {
                                    fontSize: fontSize
                                },
                                "stacked": plain
                            }
                        ]
                    },
                    tooltips: {
                        enabled: true,
                        //mode: 'label',
                        callbacks: {
                            title: function(tooltipItem, data) {
                                var labelText = tooltipItem[0].label;
                                if (labelText) {
                                    var words = labelText.split(' ');
                                    words = words.filter(function (word) {
                                        if (word.length > 0) {
                                            return word.indexOf('(') !== 0 && word.indexOf(')') !== word.length - 1;
                                        } else {
                                            return false;
                                        }
                                    });
                                    labelText = words.join(' ');
                                }
                                return labelText;
                            }
                        }
                    },
                    onClick: function(event, array) {
                        if (comp.data.views && array.length > 0) {
                            var index = array[0]._index;
                            if (index >= 0 && index < comp.data.views.length) {
                                var viewData = comp.data.views[index];
                                if (viewData != null) {
                                    Views.openView(viewData.Link, viewData.Parameters);
                                }
                            }
                        }
                    }
                };
                if (plain) {
                    chartOptions.scales.xAxes["barThickness"] = 60;
                }
                if (overrideLegendBoxWidth) {
                    if (!chartOptions.legend.labels)
                        chartOptions.legend.labels = {};
                    chartOptions.legend.labels.boxWidth = overrideLegendBoxWidth;
                }
                this.renderChart(params, chartOptions);
                this.$refs.canvas.style.width = '100%';
                this.$refs.canvas.parentNode.style.width = '100%'
            }
        }
    });

    Vue.component('bar-chart', BarChart);
});