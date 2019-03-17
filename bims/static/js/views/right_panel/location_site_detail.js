define(['backbone', 'ol', 'shared', 'chartJs', 'jquery'], function (Backbone, ol, Shared, ChartJs, $) {
    return Backbone.View.extend({
        id: 0,
        currentSpeciesSearchResult: [],
        siteChartData: {},
        siteId: null,
        siteName: null,
        siteDetailData: null,
        apiParameters: _.template(Shared.SearchURLParametersTemplate),
        months: {
            'january': 1,
            'february': 2,
            'march': 3,
            'april': 4,
            'may': 5,
            'june': 6,
            'july': 7,
            'august': 8,
            'september': 9,
            'october': 10,
            'november': 11,
            'december': 12
        },
        initialize: function () {
            Shared.Dispatcher.on('siteDetail:show', this.show, this);
            Shared.Dispatcher.on('siteDetail:updateCurrentSpeciesSearchResult', this.updateCurrentSpeciesSearchResult, this);
        },
        updateCurrentSpeciesSearchResult: function (newList) {
            this.currentSpeciesSearchResult = newList;
        },
        show: function (id, name, zoomToObject) {
            this.siteId = id;
            this.siteName = name;
            this.zoomToObject = zoomToObject;
            this.parameters = filterParameters;
            this.parameters['siteId'] = id;
            filterParameters = $.extend(true, {}, this.parameters);
            this.url = '/api/location-site-detail/' + this.apiParameters(this.parameters);
            this.showDetail(name, zoomToObject)
        },
        hideAll: function (e) {
            var className = $(e.target).attr('class');
            var target = $(e.target);
            if (className === 'search-result-title') {
                target = target.parent();
            }
            if (target.data('visibility')) {
                target.find('.filter-icon-arrow').addClass('fa-angle-down');
                target.find('.filter-icon-arrow').removeClass('fa-angle-up');
                target.nextAll().hide();
                target.data('visibility', false)
            } else {
                target.find('.filter-icon-arrow').addClass('fa-angle-up');
                target.find('.filter-icon-arrow').removeClass('fa-angle-down');
                target.nextAll().show();
                target.data('visibility', true)
            }
        },
        renderSiteDetail: function (data) {
            var $detailWrapper = $('<div></div>');
            var locationContext = {};
            var maxPanelThatShouldBeOpen = 1;
            var self = this;

            if (data.hasOwnProperty('location_context_document_json')) {
                locationContext = data['location_context_document_json'];
            }
            if (locationContext.hasOwnProperty('context_group_values')) {
                var contextGroups = locationContext['context_group_values'];
                $.each(contextGroups, function (index, value) {
                    var $classWrapper = $('<div class="sub-species-wrapper"></div>');

                    var subPanel = _.template($('#site-detail-sub-title').html());
                    var siteDetailTemplate = _.template($('#site-detail-registry-values').html());
                    $classWrapper.append(subPanel({
                        name: value['name']
                    }));

                    if (!value.hasOwnProperty('service_registry_values')) {
                        return true;
                    }

                    if (value['service_registry_values'].length === 0) {
                        return true;
                    }

                    // TODO : Change this to check graphable value
                    var isChart = false;
                    if (!((typeof chartName == 'undefined') | (typeof chartName == null))) {
                        isChart = chartName.includes('monthly')
                    }
                    ;
                    if (!((typeof service_registry_key == 'undefined') | (typeof service_registry_key == null)) & (isChart == false)) {
                        isChart = service_registry_key.toString().toLowerCase().includes('monthly');
                    }
                    ;
                    var chartData = [];

                    $.each(value['service_registry_values'], function (service_index, service_value) {
                        if (!service_value.hasOwnProperty('name') ||
                            !service_value.hasOwnProperty('value')) {
                            return true;
                        }

                        var service_value_name = service_value['name'];
                        var service_value_value = service_value['value'];

                        if (!service_value_name || !service_value_value) {
                            return true;
                        }

                        // If this is chart data, put the data to dictionary
                        if (isChart) {
                            var date = '';
                            $.each(self.months, function (key, value) {
                                if (service_value_name.toLowerCase().includes(key)) {
                                    date = value;
                                }
                            });
                            if (!date) {
                                return true;
                            }
                            chartData.push(
                                {
                                    'name': date,
                                    'value': service_value_value
                                }
                            );
                            return true;
                        }

                        $classWrapper.append(
                            siteDetailTemplate({
                                name: service_value_name,
                                value: service_value_value
                            })
                        );
                    });

                    $detailWrapper.append($classWrapper);
                    var $wrapperTitleDiv = $classWrapper.find('.search-result-sub-title');
                    $wrapperTitleDiv.click(function (e) {
                        $(this).parent().find('.result-search').toggle();
                    });

                    // Create canvas for chart, will create chart later after div ready
                    if (chartData.length > 0) {
                        var canvasKey = value['key'];

                        var resultSarch = $('<div class="result-search result-chart"></div>');
                        $('<canvas>').attr({
                            id: canvasKey
                        }).css({
                            width: '250px',
                            height: '145px'
                        }).appendTo(resultSarch);

                        $classWrapper.append(resultSarch);
                        self.siteChartData[canvasKey] = chartData;
                    }

                    if (index > maxPanelThatShouldBeOpen - 1) {
                        $classWrapper.find('.result-search').hide();
                    }

                })
            } else {
                $detailWrapper.append('<div class="side-panel-content">No detail for this site.</div>');
            }

            // Add detail dashboard button
            var button = `
                <div class="container-fluid">
                <button class="btn fbis-button right-panel-button 
                               open-detailed-site-button">Dashboard</button>`;
            $detailWrapper.append(button);

            if (is_sass_enabled) {
                var sassDetailedDashboardButton = `
                    <div class="container-fluid"><a 
                    href="/sass/dashboard/${this.parameters['siteId']}/${this.apiParameters(this.parameters)}
                    " class="btn right-panel-button right-panel-last-button 
                             fbis-button sass-button">SASS Dashboard</a></div>`;
                var sassButton = `
                    <div class="container-fluid"><a 
                    href="/sass/${this.parameters['siteId']}
                    " class="btn right-panel-button right-panel-last-button 
                             fbis-button sass-button">SASS +</a></div>`;
                $detailWrapper.append(sassDetailedDashboardButton);
                $detailWrapper.append(sassButton);
            }

            var fishFormButton = `
                <div class="container-fluid"><a 
                href="/fish-form/?siteId=${this.parameters['siteId']}
                " class="btn right-panel-button right-panel-last-button 
                         fbis-button sass-button">Fish Form</a></div>`;
            $detailWrapper.append(fishFormButton);

            return $detailWrapper;
        },

        renderPieChart: function(data, speciesType, chartName, chartCanvas) {
            if (typeof data == 'undefined') {
                return null;
            }
            var backgroundColours = [
                            '#8D2641',
                            '#D7CD47',
                            '#18A090',
                            '#A2CE89',
                            '#4E6440',
                            '#525351']
            var chartConfig = {
                type: 'pie',
                data: {
                    datasets: [{
                        data: data[speciesType][chartName + '_chart']['data'],
                        backgroundColor: backgroundColours
                    }],
                    labels: data[speciesType][chartName + '_chart']['keys']
                },
                options: {
                    responsive: false,
                    legend:{ display: false },
                    title: { display: false },
                    hover: { mode: 'nearest', intersect: false},
                    borderWidth: 0,
                }
            };
            chartCanvas = this.resetCanvas(chartCanvas);
            var ctx = chartCanvas.getContext('2d');
            new ChartJs(ctx, chartConfig);

             // Render chart labels
            var dataKeys = data[speciesType][chartName + '_chart']['keys'];
            var dataLength = dataKeys.length;
            var chart_labels = {};
            chart_labels[chartName] = ''
            for (var i = 0; i < dataLength; i++)
            {
                chart_labels[chartName] += '<div><span style="color:' +
                    backgroundColours[i] + ';">■</span>' +
                    '<span class="fish-ssdd-legend-title">&nbsp;' +
                    dataKeys[i] + '</span></div>'
            }
            var element_name = `#rp-${chartName}-legend`;
            $(element_name).html(chart_labels[chartName]);
        },

        renderSiteDetailInfo: function (data) {
            var $detailWrapper = $('<div></div>');
            if (data.hasOwnProperty('site_detail_info')) {
                var siteDetailsTemplate = _.template($('#site-details-template').html());
                $detailWrapper.append(siteDetailsTemplate({
                    'fbis_site_code' : data['site_detail_info']['fbis_site_code'],
                    'site_coordinates' : data['site_detail_info']['site_coordinates'],
                    'site_description' : data['site_detail_info']['site_description'],
                    'geomorphological_zone' : data['site_detail_info']['geomorphological_zone'],
                    'river' : data['site_detail_info']['river'],
                }));
            }
            return $detailWrapper;
        },

        renderClimateData: function (data) {
            var locationContext = {}
            var $detailWrapper = $('<div></div>');

            if (data.hasOwnProperty('climate_data'))  {
                var climateDataTemplate = _.template($('#climate-data-template').html());
                $detailWrapper.append(climateDataTemplate({
                    'mean_annual_temperature' : data['climate_data']['mean_annual_temperature'],
                    'mean_annual_rainfall' : data['climate_data']['mean_annual_rainfall']
                }));
            };
            return $detailWrapper;


        },

        createDataSummary: function (data) {
            var bio_data = data['biodiversity_data'];
            var origin_pie_canvas = document.getElementById('fish-rp-origin-pie');
            this.renderPieChart(bio_data, 'fish', 'origin', origin_pie_canvas);

            var endemism_pie_canvas = document.getElementById('fish-rp-endemism-pie');
            this.renderPieChart(bio_data, 'fish', 'endemism', endemism_pie_canvas);

            var conservation_status_pie_canvas = document.getElementById('fish-rp-conservation-status-pie');
            this.renderPieChart(bio_data, 'fish', 'cons_status', conservation_status_pie_canvas);
        },
        resetCanvas: function (chartCanvas) {
            var chartParent = chartCanvas.parentElement;
            var newCanvas = document.createElement("CANVAS");
            var chartId = chartCanvas.id;
            newCanvas.id = chartId;
            chartCanvas.remove();
            chartParent.append(newCanvas);
            return document.getElementById(chartId);
        },

        renderMonthlyLineChart: function(data_in, chartName) {

            if (!(data_in.hasOwnProperty(chartName + '_chart')))
            {
               return false;
            };

            var chartConfig = {
                type: 'line',
                data: {
                    datasets: [{
                        data: data_in[chartName + '_chart']['values'],
                        backgroundColor: '#D7CD47',
                        borderColor: '#D7CD47',
                        fill: false
                    }],
                    labels: data_in[chartName + '_chart']['keys']
                },
                options: {
                    responsive: true,
                    legend:{ display: false },
                    title: { display: false },
                    hover: { mode: 'point', intersect: false},
                    tooltips: {
                        mode: 'point',
                    },
                    borderWidth: 0,
                    scales: {
					xAxes: [{
						display: true,
						scaleLabel: {
							display: false,
							labelString: ''
						}
					}],
					yAxes: [{
						display: true,
						scaleLabel: {
							display: false,
							labelString: ''
						}
					}]
				}
                }
            };
            var chartCanvas = document.getElementById(chartName + '_chart');
            var ctx = chartCanvas.getContext('2d');
            new ChartJs(ctx, chartConfig);
        },

        renderSidePanelPieChart: function(data, speciesType, chartName) {
            var backgroundColours = [
                            '#8D2641',
                            '#D7CD47',
                            '#18A090',
                            '#A2CE89',
                            '#4E6440',
                            '#525351']
            var originChartConfig = {
                type: 'pie',
                data: {
                    datasets: [{
                        data: data['biodiversity_data'][speciesType][chartName + '_chart']['data'],
                        backgroundColor: backgroundColours
                    }],
                    labels: data['biodiversity_data'][speciesType][chartName + '_chart']['keys']
                },
                options: {
                    responsive: true,
                    legend:{ display: false },
                    title: { display: false },
                    hover: { mode: 'nearest', intersect: false},
                    borderWidth: 0,
                }
            };
            var chartCanvas = document.getElementById(speciesType + '_' + chartName + '_chart');
            var ctx = chartCanvas.getContext('2d');
            new ChartJs(ctx, originChartConfig);

            // Render chart labels
            var dataKeys = data['biodiversity_data'][speciesType][chartName + '_chart']['keys'];
            var dataLength = dataKeys.length;
            var chart_labels = {};
            chart_labels[chartName] = ''
            for (var i = 0; i < dataLength; i++)
            {
                chart_labels[chartName] += '<div><span style="color:' +
                    backgroundColours[i] + ';">■</span>' +
                    '<span style="font-style: italic;">' +
                    dataKeys[i] + '</span></div>'
            }
            $('#' + chartName + '_chart_labels').html(chart_labels[chartName]);
        },
        parseNameFromAliases: function (alias, alias_type, data) {
            var name = alias;
            var choices = [];
            var index = 0;
            if (alias_type == 'cons_status') {
                choices = this.flatten_arr(data['iucn_name_list']);
            }
            if (alias_type == 'origin')
            {
                choices = this.flatten_arr(data['origin_name_list']);
            }
            if (choices.length > 0) {
                index = choices.indexOf(alias) + 1;
                name = choices[index];
            }
            return name;
        },

        renderBiodiversityData: function (data) {
            var $detailWrapper = $('<div></div>');
            if (data.hasOwnProperty('biodiversity_data'))  {
                var biodiversityDataWrapper = _.template($('#biodiversity-data-template').html());
                $detailWrapper.append(biodiversityDataWrapper({
                    'occurrences' : data['biodiversity_data']['occurrences'],
                    'origin_data' : data['biodiversity_data']['taxa'],
                    'number_of_taxa' : data['biodiversity_data']['number_of_taxa'],
                    'ecological_condition' : data['biodiversity_data']['ecological_condition'],
                }));
            };
            return $detailWrapper;
        },

        showDetail: function (name, zoomToObject) {
            var self = this;
            // Render basic information
            var $siteDetailWrapper = $('<div></div>');
            $siteDetailWrapper.append(
                '<div id="site-detail" class="search-results-wrapper">' +
                '<div class="search-results-total" data-visibility="false"> ' +
                '<span class="search-result-title"> Site Details </span> ' +
                '<i class="fa fa-angle-down pull-right filter-icon-arrow"></i></div></div>');
            $siteDetailWrapper.append(
                '<div id="biodiversity-data" class="search-results-wrapper">' +
                '<div class="search-results-total" data-visibility="false"> ' +
                '<span class="search-result-title"> Biodiversity Data </span> ' +
                '<i class="fa fa-angle-down pull-right filter-icon-arrow"></i></div></div>');

            $siteDetailWrapper.append(
                '<div id="climate-data" class="search-results-wrapper">' +
                '<div class="search-results-total" data-visibility="false"> ' +
                '<span class="search-result-title"> Climate Data </span> ' +
                '<i class="fa fa-angle-down pull-right filter-icon-arrow"></i></div></div>');

            Shared.Dispatcher.trigger('sidePanel:openSidePanel', {});
            Shared.Dispatcher.trigger('sidePanel:fillSidePanelHtml', $siteDetailWrapper);
            Shared.Dispatcher.trigger('sidePanel:updateSidePanelTitle', '<i class="fa fa-map-marker"></i> ' + name);
            $siteDetailWrapper.find('.search-results-total').click(self.hideAll);
            $siteDetailWrapper.find('.search-results-total').click();

            // call detail
            if (Shared.LocationSiteDetailXHRRequest) {
                Shared.LocationSiteDetailXHRRequest.abort();
                Shared.LocationSiteDetailXHRRequest = null;
            }
            Shared.LocationSiteDetailXHRRequest = $.get({
                url: this.url,
                dataType: 'json',
                success: function (data) {
                    self.siteDetailData = data;
                    Shared.Dispatcher.trigger('sidePanel:updateSiteDetailData', self.siteDetailData);
                    if (data['geometry']) {
                        var feature = {
                            id: data['id'],
                            type: "Feature",
                            geometry: JSON.parse(data['geometry']),
                            properties: {}
                        };
                        var features = new ol.format.GeoJSON().readFeatures(feature, {
                            featureProjection: 'EPSG:3857'
                        });
                        if (zoomToObject) {
                            Shared.Dispatcher.trigger('map:switchHighlight', features, !zoomToObject);
                        } else {
                            Shared.Dispatcher.trigger('map:switchHighlight', features, true);
                        }
                    }
                    // render site detail
                    $('#site-detail').append(self.renderSiteDetailInfo(data));
                    var biodiversity_fish_data = data['biodiversity_data']['fish'];
                    var origin_length = biodiversity_fish_data['origin_chart']['keys'].length;
                    for (let i = 0; i < origin_length; i++)
                    {
                        let next_name = biodiversity_fish_data['origin_chart']['keys'][i];
                        biodiversity_fish_data['origin_chart']['keys'][i] =
                            self.parseNameFromAliases(next_name, 'origin',  data);
                    }
                    
                    var cons_status_length = biodiversity_fish_data['cons_status_chart']['keys'].length;
                    for (let i = 0; i < cons_status_length; i++) {
                        let next_name = biodiversity_fish_data['cons_status_chart']['keys'][i];
                        biodiversity_fish_data['cons_status_chart']['keys'][i] =
                            self.parseNameFromAliases(next_name, 'cons_status', data);
                    }

                    $('#biodiversity-data').append(self.renderBiodiversityData(data));
                    self.renderSidePanelPieChart(data, 'fish', 'origin');
                    self.renderSidePanelPieChart(data, 'fish', 'cons_status');
                    self.renderSidePanelPieChart(data, 'fish', 'endemism');


                    var climateDataHTML = self.renderClimateData(data);
                    $('#climate-data').append(climateDataHTML)
                    self.renderMonthlyLineChart(data['climate_data'], 'temperature');
                    self.renderMonthlyLineChart(data['climate_data'], 'rainfall');

                    Shared.LocationSiteDetailXHRRequest = null;
                },
                error: function (req, err) {
                    Shared.Dispatcher.trigger('sidePanel:updateSidePanelHtml', {});
                },
                renderBarChart: function (data_in, chartName, chartCanvas) {

                    if (!(data_in.hasOwnProperty(chartName + '_chart'))) {
                        return false;
                    }
                    ;

                    var chartConfig = {
                        type: 'bar',
                        data: {
                            datasets: [{
                                data: data_in[chartName + '_chart']['values'],
                                backgroundColor: '#D7CD47',
                                borderColor: '#D7CD47',
                                fill: false
                            }],
                            labels: data_in[chartName + '_chart']['keys']
                        },
                        options: {
                            responsive: true,
                            legend: {display: false},
                            title: {display: false},
                            hover: {mode: 'point', intersect: false},
                            tooltips: {
                                mode: 'point',
                            },
                            borderWidth: 0,
                            scales: {
                                xAxes: [{
                                    display: true,
                                    scaleLabel: {
                                        display: false,
                                        labelString: ''
                                    }
                                }],

                                yAxes: [{
                                    display: true,
                                    scaleLabel: {
                                        display: true,
                                        labelString: data_in[chartName + '_chart']['title']
                                    },
                                    ticks: {
                                        beginAtZero: true,
                                        callback: function (value) {
                                            if (value % 1 === 0) {
                                                return value;
                                            }
                                        }
                                    }
                                }]
                            }
                        }
                    };
                    chartCanvas = this.resetCanvas(chartCanvas);
                    var ctx = chartCanvas.getContext('2d');
                    ctx.height = '200px';
                    new ChartJs(ctx, chartConfig);
                },
                createDataSummary: function (data) {
                    var bio_data = data['biodiversity_data'];
                    var origin_pie_canvas = document.getElementById('fish-ssdd-origin-pie');
                    this.renderPieChart(bio_data, 'fish', 'origin', origin_pie_canvas);

                    var endemism_pie_canvas = document.getElementById('fish-ssdd-endemism-pie');
                    this.renderPieChart(bio_data, 'fish', 'endemism', endemism_pie_canvas);

                    var conservation_status_pie_canvas = document.getElementById('fish-ssdd-conservation-status-pie');
                    this.renderPieChart(bio_data, 'fish', 'cons_status', conservation_status_pie_canvas);
                },

            });
        },
        flatten_arr: function (arr) {
            self = this;
            return arr.reduce(function (flat, toFlatten) {
                return flat.concat(Array.isArray(toFlatten) ? self.flatten_arr(toFlatten) : toFlatten);
            }, []);
        },
    })
});
