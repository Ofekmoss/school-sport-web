var bannerUtils = {
    ApplyFrequencyPercentage: function(matchingBanners) {
        if (matchingBanners.length > 0) {
            var totalFrequency = matchingBanners.Sum('Frequency');
            if (matchingBanners.length == 1 || totalFrequency == 0) {
                matchingBanners[0].FrequencyPercentage = 100;
                for (var i = 1; i < matchingBanners.length; i++)
                    matchingBanners[i].FrequencyPercentage = 0;
            } else {
                matchingBanners.forEach(function (curBanner) {
                    var percentage = Math.floor(((curBanner.Frequency / totalFrequency) * 100) + 0.5);
                    curBanner.FrequencyPercentage = percentage;
                });
            }
        }
    },
    ApplyDirtyState: function(banner) {
        if (banner.Seq) {
            if (!banner.original_Seq) {
                var props = [];
                for (var prop in banner) {
                    if (prop.indexOf('$') == -1 && prop != 'FrequencyPercentage' && prop != 'Submitting') {
                        props.push(prop);
                    }
                }
                banner.OriginalProperties = props;
                props.forEach(function(prop) {
                    banner['original_' + prop] = banner[prop];
                });
            }
            if (banner.OriginalProperties && banner.OriginalProperties.length > 0) {
                var isDirty = false;
                for (var j = 0; j < banner.OriginalProperties.length; j++) {
                    var prop = banner.OriginalProperties[j];
                    var originalProp = 'original_' + prop;
                    if (banner[originalProp] != banner[prop]) {
                        //console.log('banner ' + banner.Seq + ' dirty (' + prop + ')');
                        isDirty = true;
                        break;
                    }
                }
                banner.IsDirty = isDirty;
            }
        }
    }
};

