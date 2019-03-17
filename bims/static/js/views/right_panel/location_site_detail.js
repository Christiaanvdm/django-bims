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
        renderBiodiversityData: function(data) {
            var biodiversity_template = _.template($('#side-panel-biodiversity-data-template').html());
            var fish_occurrences;
            if ('modules_info' in data) {
                fish_occurrences = data['modules_info']['base']['count'];
            }
            else
            {
                fish_occurrences = 'Unknown';
            }

            return biodiversity_template({
                fish_occurrences: fish_occurrences,
                invertebrate_occurrences: '0',
                algae_occurrences: '0',
                fish_sites_count: '0',
                invertebrate_sites_count: '0',
                algae_sites_count: '0',
                fish_taxa_count: '0',
                invertebrate_taxa_count: '0',
                algae_taxa_count: '0'});
        },
        createDataSummary: function (data, ) {
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
                    responsive: true,
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
            var element_name = `#fish-ssdd-${chartName}-legend`;
            $(element_name).html(chart_labels[chartName]);
        },


        renderSpeciesList: function (data) {
            var that = this;
            var $specialListWrapper = $('<div style="display: none"></div>');
            var speciesListCount = 0;
            if (data.hasOwnProperty('records_occurrence')) {
                var records_occurrence = data['records_occurrence'];
                var template = _.template($('#search-result-record-template').html());
                var classes = Object.keys(records_occurrence).sort();
                $.each(classes, function (index, className) {
                    var value = records_occurrence[className];
                    if (!className) {
                        className = 'Unknown';
                    }
                    var $classWrapper = $('<div class="sub-species-wrapper"></div>');
                    var classTemplate = _.template($('#search-result-sub-title').html());
                    $classWrapper.append(classTemplate({
                        name: className,
                        count: 0
                    }));
                    $classWrapper.hide();

                    var species = Object.keys(value).sort();
                    $.each(species, function (index, speciesName) {
                        if (that.currentSpeciesSearchResult.length > 0) {
                            // check if species name is on search mode
                            var lowerSpeciesName = speciesName.toLowerCase();
                            $.each(that.currentSpeciesSearchResult, function (currentIndex, currentSpecies) {
                                currentSpecies = currentSpecies.toLowerCase();
                                if (currentSpecies.includes(lowerSpeciesName)) {
                                    return true;
                                }
                            });
                        }
                        var speciesValue = value[speciesName];
                        $classWrapper.append(
                            template({
                                common_name: speciesName,
                                count: speciesValue.count,
                                taxon_gbif_id: speciesValue.taxon_id
                            })
                        );

                        // Species clicked
                        $classWrapper.find('#' + speciesValue.taxon_id).click(function (e) {
                            e.preventDefault();
                            Shared.Dispatcher.trigger('taxonDetail:show',
                                speciesValue.taxon_id,
                                speciesName,
                                {
                                    'id': that.siteId,
                                    'name': that.siteName
                                },
                                speciesValue.count
                            );
                        });

                        var $occurencesIndicator = $classWrapper.find('.total-occurences');
                        $occurencesIndicator.html(parseInt($occurencesIndicator.html()) + speciesValue.count);
                        $classWrapper.show();
                        speciesListCount += 1;
                    });
                    $specialListWrapper.append($classWrapper);
                    var $wrapperTitleDiv = $classWrapper.find('.search-result-sub-title');
                    $wrapperTitleDiv.click(function (e) {
                        $(this).parent().find('.result-search').toggle();
                    });
                });
            } else {
                $specialListWrapper.append('<div class="side-panel-content">No species found on this site.</div>');
            }
            $('.species-list-count').html(speciesListCount);
            return $specialListWrapper;
        },
        showDetail: function (name, zoomToObject) {
            var self = this;
            // Render basic information
            var $siteDetailWrapper = $('<div></div>');
            // $siteDetailWrapper.append(
            //     '<div id="dashboard-detail" class="search-results-wrapper">' +
            //     '<div class="search-results-total" data-visibility="false"> ' +
            //     '<span class="search-result-title"> DASHBOARD </span> ' +
            //     '<i class="fa fa-angle-down pull-right filter-icon-arrow"></i></div></div>');
            $siteDetailWrapper.append(
                '<div id="biodiversity-data" class="search-results-wrapper">' +
                '<div class="search-results-total" data-visibility="false"> ' +
                '<span class="search-result-title">Biodiversity Data</span> ' +
                '<i class="fa fa-angle-down pull-right filter-icon-arrow"></i></div></div>');
            //
            // $siteDetailWrapper.append(
            //     '<div id="species-list" class="search-results-wrapper">' +
            //     '<div class="search-results-total" data-visibility="true"> ' +
            //     '<span class="search-result-title"> SPECIES LIST (<span class="species-list-count"><i>loading</i></span>) ' +
            //     '</span> <i class="fa fa-angle-down pull-right filter-icon-arrow"></i></div></div>');

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

                    if ('biodiversity_data' in data)
                    {
                        $('#biodiversity-data').append(self.renderBiodiversityData(data));
                        self.createDataSummary(data);
                    }

                    // render species list
                    $('#species-list').append(self.renderSpeciesList(data));
                    Shared.LocationSiteDetailXHRRequest = null;
                },
                error: function (req, err) {
                    Shared.Dispatcher.trigger('sidePanel:updateSidePanelHtml', {});
                }
            });
        }
    })
});
