# coding=utf-8
"""Taxon model definition.

"""

from django.db import models
from django.contrib.postgres.fields import ArrayField
from bims.models.iucn_status import IUCNStatus
from bims.models.document_links_mixin import DocumentLinksMixin
from bims.models.endemism import Endemism


class TaxonomyField(models.CharField):

    description = 'A taxonomy field.'

    def __init__(self, taxonomy_key=None, *args, **kwargs):
        kwargs['max_length'] = 100
        kwargs['blank'] = True
        kwargs['default'] = ''
        self.taxonomy_key = taxonomy_key
        super(TaxonomyField, self).__init__(*args, **kwargs)


class Taxon(DocumentLinksMixin):
    """Taxon model."""

    gbif_id = models.IntegerField(
        verbose_name='GBIF id',
        null=True,
        blank=True,
    )
    iucn_status = models.ForeignKey(
        IUCNStatus,
        models.SET_NULL,
        verbose_name='IUCN status',
        null=True,
        blank=True,
    )
    endemism = models.ForeignKey(
        Endemism,
        models.SET_NULL,
        verbose_name='Endemism',
        null=True,
        blank=True
    )
    iucn_redlist_id = models.IntegerField(
        verbose_name='IUCN taxon id',
        null=True,
        blank=True
    )
    iucn_data = models.TextField(
        verbose_name='Data from IUCN',
        null=True,
        blank=True
    )

    # Taxonomy fields
    common_name = TaxonomyField(
        verbose_name='Common Name',
        taxonomy_key='canonicalName',
    )
    scientific_name = TaxonomyField(
        verbose_name='Scientific Name',
        taxonomy_key='scientificName'
    )
    author = TaxonomyField(
        verbose_name='Author',
        taxonomy_key='authorship'
    )
    kingdom = TaxonomyField(
        verbose_name='Kingdom',
        taxonomy_key='kingdom'
    )

    phylum = TaxonomyField(
        verbose_name='Phylum',
        taxonomy_key='phylum'
    )

    taxon_class = TaxonomyField(
        verbose_name='Class',
        taxonomy_key='class'
    )

    order = TaxonomyField(
        verbose_name='Order',
        taxonomy_key='order'
    )

    family = TaxonomyField(
        verbose_name='Family',
        taxonomy_key='family'
    )

    genus = TaxonomyField(
        verbose_name='Genus',
        taxonomy_key='genus'
    )

    species = TaxonomyField(
        verbose_name='Species',
        taxonomy_key='species'
    )

    taxon_id = TaxonomyField(
        verbose_name='Taxon ID',
        taxonomy_key='taxonID'
    )

    accepted_name = TaxonomyField(
        verbose_name='Accepted Name',
        taxonomy_key='accepted'
    )

    accepted_key = TaxonomyField(
        verbose_name='Accepted Key',
        taxonomy_key='acceptedKey'
    )

    vernacular_names = ArrayField(
        models.CharField(
                max_length=100,
                blank=True,
                default=''),
        verbose_name='Vernacular Names',
        default=[],
        null=True,
        blank=True
    )

    # noinspection PyClassicStyleClass
    class Meta:
        """Meta class for project."""
        app_label = 'bims'
        verbose_name_plural = 'Taxa'
        verbose_name = 'Taxon'

    def __str__(self):
        return "%s (%s)" % (self.common_name, self.iucn_status)
