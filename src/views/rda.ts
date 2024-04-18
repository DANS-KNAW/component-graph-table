export const pathwaysJoin = `
    LEFT JOIN (
        SELECT
            uuid_resource as uuid_rda,
            json_agg(
                json_build_object(
                    'uuid_pathway', pathway.uuid_pathway,
                    'pathway', pathway.pathway,
                    'description', pathway.description,
                    'datasource', pathway.datasource,
                    'relation', resource_pathway.relation
                )
            ) AS pathways
        FROM resource_pathway, pathway
        WHERE pathway.uuid_pathway = resource_pathway.uuid_pathway
        GROUP BY resource_pathway.uuid_resource
    ) AS pathways USING (uuid_rda)
`;

export const workflowsJoin = `
    LEFT JOIN (
        SELECT
            uuid_resource as uuid_rda,
            json_agg(
                json_build_object(
                    'uuid_workflow', workflow.uuid_workflow,
                    'workflowstate', workflow.workflowstate,
                    'description', workflow.description
                )
            ) AS workflows
        FROM resource_workflow, workflow
        WHERE workflow.uuid_workflow = resource_workflow.uuid_adoptionstate
        GROUP BY resource_workflow.uuid_resource
    ) AS workflows USING (uuid_rda)
`;

export const relationsJoin = `
    LEFT JOIN (
        SELECT
            uuid_resource as uuid_rda,
            json_agg(
                json_build_object(
                    'uuid_relation', relation.uuid_relation,
                    'uuid_relationtype', relation.uuid_relationtype,
                    'relation', relation.relation,
                    'relation_type', relation.relation_type,
                    'shortdescription', relation.shortdescription,
                    'description', relation.description,
                    'last_update', relation.last_update
                )
            ) AS relations
        FROM relation, resource_relation
        WHERE relation.uuid_relationtype = resource_relation.uuid_relationtype
        GROUP BY resource_relation.uuid_resource
    ) AS relations USING (uuid_rda)
`;

export const rightsJoin = `
    LEFT JOIN (
        SELECT
            uuid_resource as uuid_rda,
            json_agg(
                json_build_object(
                    'lod_pid', rights.lod_pid,
                    'description', rights.description,
                    'type', rights.type,
                    'status', resource_rights.status
                )
            ) AS rights
        FROM resource_rights, rights
        WHERE rights.lod_pid = resource_rights.lod_pid
        GROUP BY resource_rights.uuid_resource
    ) AS rights USING (uuid_rda)
`;

export const subjectsJoin = `
    LEFT JOIN (
        SELECT
            uuid_resource as uuid_rda,
            array_agg(keyword) AS subjects
        FROM subject_resource
        WHERE uuid_resource IS NOT NULL
        GROUP BY uuid_resource
    ) AS subjects USING (uuid_rda)
`;

export const workingGroupsJoin = `
    LEFT JOIN (
        SELECT
            uuid_resource as uuid_rda,
            json_agg(
                json_build_object(
                    'uuid_workinggroup', workinggroup.uuid_workinggroup,
                    'relation', group_resource.relation,
                    'title', workinggroup.title,
                    'description', workinggroup.description,
                    'uuid_domain', workinggroup.uuid_domain,
                    'domains', workinggroup.domains,
                    'url', workinggroup.url
                )
            ) AS working_groups
        FROM workinggroup, group_resource
        WHERE workinggroup.uuid_workinggroup = group_resource.uuid_group
        GROUP BY group_resource.uuid_resource
    ) AS working_groups USING (uuid_rda) 
`;

export const interestGroupsJoin = `
    LEFT JOIN (
        SELECT
            uuid_resource as uuid_rda,
            json_agg(
                json_build_object(
                    'uuid_interestgroup', interestgroup.uuid_interestgroup,
                    'relation', group_resource.relation,
                    'title', interestgroup.title,
                    'description', interestgroup.description,
                    'uuid_domain', interestgroup.uuid_domain,
                    'domains', interestgroup.domains,
                    'url', interestgroup.url
                )
            ) AS interest_groups
        FROM interestgroup, group_resource
        WHERE interestgroup.uuid_interestgroup = group_resource.uuid_group
        GROUP BY group_resource.uuid_resource
    ) AS interest_groups USING (uuid_rda)
`;

export const individualJoin = `
    LEFT JOIN (
        SELECT
            uuid_resource as uuid_rda,
            json_agg(
                json_build_object(
                    'uuid_individual', individual.uuid_individual,
                    'relation', individual_resource.relation,
                    'combinedname', individual.combinedname,
                    'firstname', individual.firstname,
                    'lastname', individual.lastname,
                    'fullname', individual.fullname,
                    '_revision_id', individual._revision_id,
                    'title', individual.title,
                    'privacy_ticked', individual.privacy_ticked,
                    'short_bio', individual.short_bio,
                    'rda_page', individual.rda_page,
                    'linked_in', individual.linked_in,
                    'twitter', individual.twitter,
                    'identifier', individual.identifier,
                    'source', individual.source,
                    'uuid_rda_country', individual.uuid_rda_country,
                    'country', individual.country,
                    'working_groups', (
                        SELECT 
                            json_agg(working_obj) FILTER (WHERE working_obj IS NOT NULL)
                        FROM (
                            SELECT
                                json_build_object(
                                    'uuid_workinggroup', workinggroup.uuid_workinggroup,
                                    'title', workinggroup.title,
                                    'member_type', COALESCE(individual_group.member_type, individual_groupall.relation)
                                ) AS working_obj
                            FROM individual_groupall
                            LEFT JOIN workinggroup ON individual_groupall.uuid_group = workinggroup.uuid_workinggroup
                            LEFT JOIN individual_group ON individual_groupall.uuid_group = individual_group.uuid_group
                                AND individual_groupall.uuid_individual = individual_group.uuid_individual
                            WHERE individual_groupall.uuid_individual = individual.uuid_individual
                            AND (workinggroup.uuid_workinggroup IS NOT NULL OR workinggroup.title IS NOT NULL)
                        ) wg
                    ),
                    'interest_groups', (
                        SELECT 
                            json_agg(interest_obj) FILTER (WHERE interest_obj IS NOT NULL)
                        FROM (
                            SELECT
                                json_build_object(
                                    'uuid_interestgroup', interestgroup.uuid_interestgroup,
                                    'title', interestgroup.title,
                                    'member_type', COALESCE(individual_group.member_type, individual_groupall.relation)
                                ) AS interest_obj
                            FROM individual_groupall
                            LEFT JOIN interestgroup ON individual_groupall.uuid_group = interestgroup.uuid_interestgroup
                            LEFT JOIN individual_group ON individual_groupall.uuid_group = individual_group.uuid_group
                                AND individual_groupall.uuid_individual = individual_group.uuid_individual
                            WHERE individual_groupall.uuid_individual = individual.uuid_individual
                            AND (interestgroup.uuid_interestgroup IS NOT NULL OR interestgroup.title IS NOT NULL)
                        ) ig
                    ),
                    'institutions', (
                        SELECT
                            json_agg(institution_obj) FILTER (WHERE institution_obj IS NOT NULL)
                        FROM (
                            SELECT
                                json_build_object(
                                    'uuid_institution', institutions.uuid_institution,
                                    'institution', institutions.institution,
                                    'english_name', institutions.english_name
                                ) AS institution_obj
                            FROM individual_institution
                            LEFT JOIN institutions ON individual_institution.uuid_institution = institutions.uuid_institution
                            WHERE individual_institution.uuid_rda_member = individual.uuid_individual
                            AND (institutions.uuid_institution IS NOT NULL OR institutions.institution IS NOT NULL OR institutions.english_name IS NOT NULL)
                        ) inst
                    )
                )
            ) AS individuals
        FROM individual_resource
        LEFT JOIN individual ON individual.uuid_individual = individual_resource.uuid_individual
        GROUP BY individual_resource.uuid_resource
    ) AS individuals USING (uuid_rda)
`;

export const institutionsJoin = `
    LEFT JOIN (
        SELECT
            uuid_resource as uuid_rda,
            json_agg(
                DISTINCT jsonb_build_object(
                    'uuid_institution', institutions.uuid_institution,
                    'institution', institutions.institution,
                    'english_name', institutions.english_name,
                    'parent_institution', institutions.parent_institution,
                    'organisation_type', jsonb_build_object(
                        'uuid_orgtype', orgtype.organisationtypeid,
                        'organisationtype', orgtype.organisationtype,
                        'linktext', orgtype.linktext,
                        'description', orgtype.description
                    ),
                    'institution_role', json_build_object(
                        'institutionroleid', institution_roles.institutionroleid,
                        'institutionrole', institution_roles.institutionrole,
                        'rda_taxonomy', institution_roles.rda_taxonomy,
                        'description', institution_roles.description
                    ),
                    'uuid_country', institution_country.uuidcountry,
                    'country', institution_country.country
                )
            ) AS institutions
        FROM 
            individual_resource
        LEFT JOIN (
            SELECT
                uuid_rda_member,
                uuid_institution
            FROM individual_institution
            UNION
            SELECT
                uuid_individual,
                uuid_institution
            FROM individual_member
        ) AS institutions_individuals ON individual_resource.uuid_individual = institutions_individuals.uuid_rda_member
        LEFT JOIN institutions ON institutions.uuid_institution = institutions_individuals.uuid_institution
        LEFT JOIN institution_country ON institutions.uuid_institution = institution_country.uuid_institution
        LEFT JOIN institution_organisationtype ON  institutions.uuid_institution = institution_organisationtype.uuid_institution
        LEFT JOIN orgtype ON institution_organisationtype.uuid_orgtype = orgtype.organisationtypeid
        LEFT JOIN institution_institutionrole ON institutions.uuid_institution = institution_institutionrole.uuid_institution
        LEFT JOIN institution_roles ON institution_institutionrole.institutionroleid = institution_roles.institutionroleid
        GROUP BY individual_resource.uuid_resource
    ) AS institutions USING (uuid_rda)
`;

export const uriTypeJoin = `
    LEFT JOIN (
        SELECT
            uuid_uritype,
            json_build_object(
                'uritype', uri_type.uritype,
                'description', uri_type.description
            ) AS uritype
        FROM uri_type
    ) AS uritype USING (uuid_uritype)
`;
