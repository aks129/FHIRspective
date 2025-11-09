/**
 * Service for caching fetched FHIR resources in memory
 * This allows quick access to resources during and after assessment
 */

export interface CachedResource {
  resourceType: string;
  resourceId: string;
  resource: any;
  assessmentId: number;
  fetchedAt: Date;
}

interface AssessmentCache {
  [assessmentId: number]: {
    [resourceType: string]: CachedResource[];
  };
}

class ResourceCacheService {
  private cache: AssessmentCache = {};

  /**
   * Store fetched resources for an assessment
   */
  storeResources(
    assessmentId: number,
    resourceType: string,
    resources: any[]
  ): void {
    console.log(`Caching ${resources.length} ${resourceType} resources for assessment ${assessmentId}`);

    // Initialize assessment cache if needed
    if (!this.cache[assessmentId]) {
      this.cache[assessmentId] = {};
    }

    // Initialize resource type array if needed
    if (!this.cache[assessmentId][resourceType]) {
      this.cache[assessmentId][resourceType] = [];
    }

    // Store resources
    const cachedResources: CachedResource[] = resources.map(resource => ({
      resourceType,
      resourceId: resource.id || 'unknown',
      resource,
      assessmentId,
      fetchedAt: new Date()
    }));

    this.cache[assessmentId][resourceType] = cachedResources;
    console.log(`Successfully cached ${cachedResources.length} ${resourceType} resources`);
  }

  /**
   * Retrieve cached resources for an assessment
   */
  getResources(
    assessmentId: number,
    resourceType?: string
  ): CachedResource[] {
    if (!this.cache[assessmentId]) {
      return [];
    }

    if (resourceType) {
      return this.cache[assessmentId][resourceType] || [];
    }

    // Return all resources for the assessment
    const allResources: CachedResource[] = [];
    for (const type in this.cache[assessmentId]) {
      allResources.push(...this.cache[assessmentId][type]);
    }

    return allResources;
  }

  /**
   * Get a specific resource by ID
   */
  getResourceById(
    assessmentId: number,
    resourceType: string,
    resourceId: string
  ): any | null {
    const resources = this.getResources(assessmentId, resourceType);
    const found = resources.find(r => r.resourceId === resourceId);
    return found ? found.resource : null;
  }

  /**
   * Get cache statistics for an assessment
   */
  getCacheStats(assessmentId: number): {
    totalResources: number;
    resourceTypes: { [type: string]: number };
    cacheSize: string;
  } {
    if (!this.cache[assessmentId]) {
      return {
        totalResources: 0,
        resourceTypes: {},
        cacheSize: '0 KB'
      };
    }

    let totalResources = 0;
    const resourceTypes: { [type: string]: number } = {};

    for (const type in this.cache[assessmentId]) {
      const count = this.cache[assessmentId][type].length;
      resourceTypes[type] = count;
      totalResources += count;
    }

    // Estimate cache size (rough approximation)
    const cacheString = JSON.stringify(this.cache[assessmentId]);
    const sizeInBytes = cacheString.length;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);

    return {
      totalResources,
      resourceTypes,
      cacheSize: `${sizeInKB} KB`
    };
  }

  /**
   * Clear cache for a specific assessment
   */
  clearAssessmentCache(assessmentId: number): void {
    if (this.cache[assessmentId]) {
      console.log(`Clearing cache for assessment ${assessmentId}`);
      delete this.cache[assessmentId];
    }
  }

  /**
   * Clear all cache (useful for memory management)
   */
  clearAllCache(): void {
    console.log('Clearing all cached resources');
    this.cache = {};
  }

  /**
   * Get list of assessments with cached resources
   */
  getCachedAssessments(): number[] {
    return Object.keys(this.cache).map(id => parseInt(id));
  }
}

export const resourceCacheService = new ResourceCacheService();
